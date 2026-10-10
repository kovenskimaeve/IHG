import crypto from 'node:crypto'

// ---------- small helpers shared by every serverless function ----------

const b64u = (buf) => Buffer.from(buf).toString('base64url')
const fromB64u = (s) => Buffer.from(s, 'base64url')

// Constant-time string comparison (hash both sides first so lengths don't leak).
export function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a ?? '')).digest()
  const hb = crypto.createHash('sha256').update(String(b ?? '')).digest()
  return crypto.timingSafeEqual(ha, hb)
}

// ---------- HS256 JWT (no dependency) ----------
// The same token is accepted by Supabase (it verifies with the project's JWT
// secret) and by our own /api routes, so one proof of "entered a valid code"
// gates both the database and the file endpoints.

export function signToken(claims, secret, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'HS256', typ: 'JWT' }
  const payload = { ...claims, iat: now, exp: now + ttlSeconds }
  const data = `${b64u(JSON.stringify(header))}.${b64u(JSON.stringify(payload))}`
  const sig = crypto.createHmac('sha256', secret).update(data).digest()
  return `${data}.${b64u(sig)}`
}

export function verifyToken(token, secret) {
  try {
    if (!token || !secret) return null
    const [h, p, s] = String(token).split('.')
    if (!h || !p || !s) return null
    const header = JSON.parse(fromB64u(h).toString())
    if (header.alg !== 'HS256') return null // refuse "none" and anything else
    const expected = crypto.createHmac('sha256', secret).update(`${h}.${p}`).digest()
    const given = fromB64u(s)
    if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null
    const payload = JSON.parse(fromB64u(p).toString())
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

// ---------- cookies ----------

export function parseCookies(req) {
  const out = {}
  const raw = req.headers?.cookie
  if (!raw) return out
  raw.split(';').forEach((part) => {
    const i = part.indexOf('=')
    if (i === -1) return
    out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim())
  })
  return out
}

export function cookieHeader(name, value, { maxAge, httpOnly = true } = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax', 'Secure']
  if (httpOnly) parts.push('HttpOnly')
  if (typeof maxAge === 'number') parts.push(`Max-Age=${maxAge}`)
  return parts.join('; ')
}

// ---------- who is calling? (hashed, never stored raw) ----------

export function clientKey(req) {
  const ip =
    req.headers?.['x-real-ip'] ||
    String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket?.remoteAddress ||
    'unknown'
  // Salted hash: lets us rate-limit per visitor without keeping anyone's IP.
  const salt = process.env.RATE_LIMIT_SALT || process.env.ADMIN_PASSWORD || 'ihg'
  return crypto.createHash('sha256').update(`${salt}|${ip}`).digest('hex').slice(0, 32)
}

// ---------- rate limiting (state lives in the rate_limits table) ----------
// Returns { allowed, retryAfter }. Fails OPEN if the table is missing, so the
// site keeps working before migration-9 is run; it just isn't limited yet.

export async function rateLimit(supabaseAdmin, bucket, key, max, windowSeconds) {
  try {
    const id = `${bucket}:${key}`
    const now = Date.now()
    const { data: row, error } = await supabaseAdmin.from('rate_limits').select('*').eq('id', id).maybeSingle()
    if (error) return { allowed: true }
    const start = row ? new Date(row.window_start).getTime() : 0
    if (!row || now - start > windowSeconds * 1000) {
      await supabaseAdmin.from('rate_limits').upsert({ id, count: 1, window_start: new Date(now).toISOString() })
      return { allowed: true }
    }
    if (row.count >= max) {
      return { allowed: false, retryAfter: Math.ceil((start + windowSeconds * 1000 - now) / 1000) }
    }
    await supabaseAdmin.from('rate_limits').update({ count: row.count + 1 }).eq('id', id)
    return { allowed: true }
  } catch {
    return { allowed: true }
  }
}

export async function clearRateLimit(supabaseAdmin, bucket, key) {
  try { await supabaseAdmin.from('rate_limits').delete().eq('id', `${bucket}:${key}`) } catch { /* ignore */ }
}

// ---------- member session (cookie or Bearer) ----------

export function getMember(req) {
  const secret = process.env.SUPABASE_JWT_SECRET
  const bearer = String(req.headers?.authorization || '').replace(/^Bearer\s+/i, '')
  const token = bearer || parseCookies(req).ihg_session
  const claims = verifyToken(token, secret)
  return claims && claims.app_role === 'member' ? claims : null
}

// ---------- admin password check with lockout ----------
// Only WRONG guesses count, and only per visitor (5 per 15 min), so the real admin
// can use the panel freely and an attacker can't lock the admin out by spamming.
// A long random ADMIN_PASSWORD makes guessing infeasible even before this limit.

async function isLimited(supabaseAdmin, bucket, key, max, windowSeconds) {
  try {
    const { data: row, error } = await supabaseAdmin.from('rate_limits').select('*').eq('id', `${bucket}:${key}`).maybeSingle()
    if (error || !row) return { limited: false }
    const start = new Date(row.window_start).getTime()
    const left = start + windowSeconds * 1000 - Date.now()
    if (left > 0 && row.count >= max) return { limited: true, retryAfter: Math.ceil(left / 1000) }
  } catch { /* fail open */ }
  return { limited: false }
}

async function recordFailure(supabaseAdmin, bucket, key, windowSeconds) {
  try {
    const id = `${bucket}:${key}`
    const { data: row } = await supabaseAdmin.from('rate_limits').select('*').eq('id', id).maybeSingle()
    const fresh = !row || Date.now() - new Date(row.window_start).getTime() > windowSeconds * 1000
    if (fresh) await supabaseAdmin.from('rate_limits').upsert({ id, count: 1, window_start: new Date().toISOString() })
    else await supabaseAdmin.from('rate_limits').update({ count: row.count + 1 }).eq('id', id)
  } catch { /* ignore */ }
}

export async function checkAdmin(req, supabaseAdmin, password) {
  const adminPw = process.env.ADMIN_PASSWORD
  if (!adminPw) return { ok: false, status: 500, error: 'Server misconfigured: ADMIN_PASSWORD is not set.' }
  const key = clientKey(req)
  const lim = await isLimited(supabaseAdmin, 'admin-fail', key, 5, 900)
  if (lim.limited) return { ok: false, status: 429, error: 'Too many wrong attempts. Wait a few minutes and try again.' }
  if (!safeEqual(password, adminPw)) {
    await recordFailure(supabaseAdmin, 'admin-fail', key, 900)
    return { ok: false, status: 401, error: 'Wrong password' }
  }
  await clearRateLimit(supabaseAdmin, 'admin-fail', key)
  return { ok: true }
}
