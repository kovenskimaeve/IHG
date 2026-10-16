import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Unambiguous charset: no 0/O, 1/I/L, so codes are easy to read back over text/email.
const CHARSET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

function generateCode(length = 6) {
  let out = ''
  for (let i = 0; i < length; i++) out += CHARSET[Math.floor(Math.random() * CHARSET.length)]
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).json({ ok: false, error: 'Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.' })
  }

  const { action, payload } = req.body || {}

  try {
    // ---- redeem: called by the gate itself, no admin password needed ----
    if (action === 'redeem') {
      const code = (payload?.code || '').trim().toUpperCase()
      if (!code) return res.status(400).json({ ok: false, error: 'Enter a code.' })

      const { data: invite, error: findError } = await supabaseAdmin
        .from('beta_invites')
        .select('*')
        .eq('code', code)
        .maybeSingle()

      if (findError) throw findError
      if (!invite) return res.status(401).json({ ok: false, error: 'That code isn\'t valid.' })

      if (invite.used_at) {
        // Already redeemed once. Still let it through only if this exact
        // browser already holds the matching local token (handled client-side
        // by not re-calling redeem once access is granted) -- so reaching
        // here with an already-used code means someone else is trying it.
        return res.status(401).json({ ok: false, error: 'That code has already been used on another device. Ask an admin to reset it if this is your own.' })
      }

      const { error: updateError } = await supabaseAdmin
        .from('beta_invites')
        .update({ used_at: new Date().toISOString() })
        .eq('id', invite.id)
      if (updateError) throw updateError

      return res.status(200).json({ ok: true, token: invite.code })
    }

    // ---- everything below requires the admin password ----
    if (payload?.password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ ok: false, error: 'Wrong password' })
    }

    if (action === 'list') {
      const { data, error } = await supabaseAdmin.from('beta_invites').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ ok: true, data })
    }

    if (action === 'generate') {
      const count = Math.min(Math.max(parseInt(payload?.count, 10) || 1, 1), 50)
      const labels = (payload?.labels || '').split('\n').map((l) => l.trim()).filter(Boolean)
      const rows = []
      for (let i = 0; i < count; i++) {
        let code
        // Extremely unlikely to collide at this volume, but check anyway.
        for (let attempt = 0; attempt < 5; attempt++) {
          code = generateCode()
          const { data: existing } = await supabaseAdmin.from('beta_invites').select('id').eq('code', code).maybeSingle()
          if (!existing) break
        }
        rows.push({ code, label: labels[i] || null })
      }
      const { data, error } = await supabaseAdmin.from('beta_invites').insert(rows).select()
      if (error) throw error
      return res.status(200).json({ ok: true, data })
    }

    if (action === 'reset') {
      const { error } = await supabaseAdmin.from('beta_invites').update({ used_at: null }).eq('id', payload.id)
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
    return res.status(500).json({ ok: false, error: err.message || 'Server error' })
  }
}
