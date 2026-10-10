import crypto from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import {
  signToken, cookieHeader, parseCookies, clientKey, rateLimit, clearRateLimit, checkAdmin,
} from './_lib/security.js'

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const SESSION_SECONDS = 12 * 60 * 60 // a session token is good for 12 hours
const DEVICE_SECONDS = 365 * 24 * 60 * 60

// Unambiguous charset: no 0/O, 1/I/L, so codes are easy to read back over text/email.
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode(length = 8) {
  let out = ''
  for (let i = 0; i < length; i++) out += CHARSET[crypto.randomInt(CHARSET.length)] // crypto-grade, not Math.random
  return out
}

const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex')

// A signed session. Supabase accepts it (so row-level security can require it)
// and so do our own file endpoints. Nobody can mint one without the secret.
function startSession(res, extraCookies = []) {
  const token = signToken(
    { role: 'authenticated', aud: 'authenticated', sub: crypto.randomUUID(), app_role: 'member' },
    process.env.SUPABASE_JWT_SECRET,
    SESSION_SECONDS
  )
  res.setHeader('Set-Cookie', [cookieHeader('ihg_session', token, { maxAge: SESSION_SECONDS }), ...extraCookies])
  return token
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.SUPABASE_JWT_SECRET) {
    return res.status(500).json({
      ok: false,
      error: 'Server misconfigured: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and SUPABASE_JWT_SECRET must all be set in Vercel.',
    })
  }

  const { action, payload } = req.body || {}

  try {
    // ---------------- redeem an invite code ----------------
    if (action === 'redeem') {
      const key = clientKey(req)
      const mine = await rateLimit(supabaseAdmin, 'redeem-ip', key, 8, 900)
      if (!mine.allowed) {
        return res.status(429).json({ ok: false, error: 'Too many tries. Wait a few minutes and try again.' })
      }

      const code = String(payload?.code || '').trim().toUpperCase().slice(0, 32)
      if (!code) return res.status(400).json({ ok: false, error: 'Enter a code.' })

      const { data: invite, error: findError } = await supabaseAdmin
        .from('beta_invites').select('*').eq('code', code).maybeSingle()
      if (findError) throw findError
      if (!invite) return res.status(401).json({ ok: false, error: "That code isn't valid." })

      // Each code belongs to the first browser that redeems it. The browser
      // proves it's the same one with an HttpOnly cookie, so the owner can
      // come back on later visits but nobody they forward the code to can.
      const cookies = parseCookies(req)
      const deviceSecret = cookies.ihg_dev || crypto.randomBytes(32).toString('hex')
      const deviceHash = sha(deviceSecret)

      if (invite.used_at && invite.device_hash && invite.device_hash !== deviceHash) {
        return res.status(401).json({ ok: false, error: 'That code has already been used on another device. Ask an admin to reset it if this is your own.' })
      }

      // Unused, or a legacy used code with no device recorded yet: bind it here.
      if (!invite.used_at || !invite.device_hash) {
        let { error: updateError } = await supabaseAdmin
          .from('beta_invites')
          .update({ used_at: invite.used_at || new Date().toISOString(), device_hash: deviceHash })
          .eq('id', invite.id)
        if (updateError && updateError.code === '42703') {
          // migration-9 not run yet (no device_hash column): fall back to the old single-use behaviour
          if (invite.used_at) return res.status(401).json({ ok: false, error: 'That code has already been used. Ask an admin to reset it.' })
          ;({ error: updateError } = await supabaseAdmin.from('beta_invites').update({ used_at: new Date().toISOString() }).eq('id', invite.id))
        }
        if (updateError) throw updateError
      }

      await clearRateLimit(supabaseAdmin, 'redeem-ip', key)
      const deviceCookie = cookieHeader('ihg_dev', deviceSecret, { maxAge: DEVICE_SECONDS })
      const token = startSession(res, [deviceCookie])
      return res.status(200).json({ ok: true, token })
    }

    // ---------------- open mode: no code needed (only if you switch it on) ----------------
    // Set OPEN_ACCESS=true in Vercel when the site goes public. Visitors still get a
    // real signed session (so the database stays closed to anyone outside the site).
    if (action === 'open') {
      if (process.env.OPEN_ACCESS !== 'true') return res.status(403).json({ ok: false, error: 'Access code required.' })
      const gate = await rateLimit(supabaseAdmin, 'open-ip', clientKey(req), 60, 900)
      if (!gate.allowed) return res.status(429).json({ ok: false, error: 'Too many requests. Try again shortly.' })
      return res.status(200).json({ ok: true, token: startSession(res) })
    }

    // ---------------- everything below needs the admin password ----------------
    const auth = await checkAdmin(req, supabaseAdmin, payload?.password)
    if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

    // An admin gets a normal member session so they can browse the site too.
    if (action === 'admin_session') {
      const token = startSession(res)
      return res.status(200).json({ ok: true, token })
    }

    if (action === 'list') {
      const { data, error } = await supabaseAdmin
        .from('beta_invites')
        .select('id, code, label, used_at, used_note, created_at')
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ ok: true, data })
    }

    if (action === 'generate') {
      const count = Math.min(Math.max(parseInt(payload?.count, 10) || 1, 1), 50)
      const labels = String(payload?.labels || '').split('\n').map((l) => l.trim().slice(0, 80)).filter(Boolean)
      const rows = []
      for (let i = 0; i < count; i++) {
        let code
        for (let attempt = 0; attempt < 5; attempt++) {
          code = generateCode()
          const { data: existing } = await supabaseAdmin.from('beta_invites').select('id').eq('code', code).maybeSingle()
          if (!existing) break
        }
        rows.push({ code, label: labels[i] || null })
      }
      const { data, error } = await supabaseAdmin.from('beta_invites').insert(rows).select('id, code, label, used_at, created_at')
      if (error) throw error
      return res.status(200).json({ ok: true, data })
    }

    if (action === 'reset') {
      let { error } = await supabaseAdmin.from('beta_invites').update({ used_at: null, device_hash: null }).eq('id', payload.id)
      if (error && error.code === '42703') ({ error } = await supabaseAdmin.from('beta_invites').update({ used_at: null }).eq('id', payload.id))
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    if (action === 'delete') {
      const { error } = await supabaseAdmin.from('beta_invites').delete().eq('id', payload.id)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' })
  } catch (err) {
    console.error('[api/beta-access]', action, err)
    return res.status(500).json({ ok: false, error: 'Server error' }) // never echo internals to the browser
  }
}
