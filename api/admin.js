import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.ADMIN_PASSWORD) {
    // This is the #1 cause of "admin can't access/view/delete anything": one or more
    // of SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / ADMIN_PASSWORD isn't set in the
    // Vercel project's Environment Variables (Settings -> Environment Variables),
    // or was added without redeploying afterwards.
    return res.status(500).json({
      ok: false,
      error: 'Server misconfigured: missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or ADMIN_PASSWORD in Vercel env vars.',
    })
  }

  const { password, action, payload } = req.body || {}
  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ ok: false, error: 'Wrong password' })
  }

  try {
    if (action === 'ping') return res.status(200).json({ ok: true })

    // ---- reads (service role bypasses RLS, so these always work regardless of
    // whatever public/anon policies are or aren't set on these tables) ----
    if (action === 'list_posts') {
      let q = supabaseAdmin.from('discussion_posts').select('*').order('created_at', { ascending: false })
      if (payload?.onlyFlagged) q = q.gt('flag_count', 0)
      const { data, error } = await q
      if (error) throw error
      return res.status(200).json({ ok: true, data })
    }

    if (action === 'list_files') {
      const { data, error } = await supabaseAdmin.from('files').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ ok: true, data })
    }

    if (action === 'list_requests') {
      const { data, error } = await supabaseAdmin
        .from('resource_requests')
        .select('*')
        .neq('subject', 'Feedback')
        .order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ ok: true, data })
    }

    if (action === 'list_feedback') {
      const { data, error } = await supabaseAdmin.from('feedback').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return res.status(200).json({ ok: true, data })
    }

    // ---- writes ----
    if (action === 'unhide_post') {
      const { error } = await supabaseAdmin.from('discussion_posts').update({ hidden: false, flag_count: 0 }).eq('id', payload.id)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    if (action === 'delete_post') {
      const { error } = await supabaseAdmin.from('discussion_posts').delete().eq('id', payload.id)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    if (action === 'delete_file') {
      const { error } = await supabaseAdmin.from('files').delete().eq('id', payload.id)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    if (action === 'delete_request') {
      const { error } = await supabaseAdmin.from('resource_requests').delete().eq('id', payload.id)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    if (action === 'delete_feedback') {
      const { error } = await supabaseAdmin.from('feedback').delete().eq('id', payload.id)
      if (error) throw error
      return res.status(200).json({ ok: true })
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' })
  } catch (err) {
    console.error('[api/admin]', action, err)
    return res.status(500).json({ ok: false, error: err.message || 'Server error' })
  }
}
