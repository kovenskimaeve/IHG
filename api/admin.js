// Vercel serverless function. This runs on the server only — the admin
// password and the Supabase service-role key never reach the browser,
// which is what actually makes this page secure (unlike a plain client
// -side password check anyone could bypass in devtools).

import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false })

  const { password, action, payload } = req.body || {}
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Wrong password' })
  }

  if (action === 'ping') return res.status(200).json({ ok: true })

  if (action === 'unhide_post') {
    await supabaseAdmin.from('discussion_posts').update({ hidden: false, flag_count: 0 }).eq('id', payload.id)
    return res.status(200).json({ ok: true })
  }

  if (action === 'delete_post') {
    await supabaseAdmin.from('discussion_posts').delete().eq('id', payload.id)
    return res.status(200).json({ ok: true })
  }

  if (action === 'delete_file') {
    await supabaseAdmin.from('files').delete().eq('id', payload.id)
    return res.status(200).json({ ok: true })
  }

  return res.status(400).json({ ok: false, error: 'Unknown action' })
}
