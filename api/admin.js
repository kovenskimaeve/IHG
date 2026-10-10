import { createClient } from '@supabase/supabase-js'
import { checkAdmin } from './_lib/security.js'

const supabaseAdmin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const ok = (res, extra = {}) => res.status(200).json({ ok: true, ...extra })

// ---------------------------------------------------------------------------
// Archive: nothing an admin removes is truly destroyed. We copy it into
// admin_archive first, then delete it from the live table so it disappears
// from the site. If the copy fails we stop BEFORE deleting anything.
// ---------------------------------------------------------------------------
async function archiveRow(kind, originalId, row, children, summary) {
  const { error } = await supabaseAdmin.from('admin_archive').insert({
    kind,
    original_id: originalId,
    summary: String(summary || '').slice(0, 200),
    data: { row, children: children || [] },
  })
  if (error) {
    throw new Error(`Could not archive before deleting, so nothing was deleted (${error.message}). Run supabase/migration-9.sql first.`)
  }
}

async function postWithReplies(id) {
  const { data: root, error } = await supabaseAdmin.from('discussion_posts').select('*').eq('id', id).maybeSingle()
  if (error) throw error
  if (!root) return null
  const replies = []
  let frontier = [root.id]
  while (frontier.length && replies.length < 2000) {
    const { data, error: e2 } = await supabaseAdmin.from('discussion_posts').select('*').in('parent_id', frontier)
    if (e2) throw e2
    if (!data?.length) break
    replies.push(...data)
    frontier = data.map((r) => r.id)
  }
  return { root, replies }
}

const short = (s, n = 80) => String(s || '').replace(/\s+/g, ' ').slice(0, n)

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' })

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.ADMIN_PASSWORD) {
    return res.status(500).json({
      ok: false,
      error: 'Server misconfigured: missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or ADMIN_PASSWORD in Vercel env vars.',
    })
  }

  const { password, action, payload } = req.body || {}
  const auth = await checkAdmin(req, supabaseAdmin, password)
  if (!auth.ok) return res.status(auth.status).json({ ok: false, error: auth.error })

  try {
    if (action === 'ping') return ok(res)

    // ---------------- reads (service role bypasses RLS) ----------------
    if (action === 'list_posts') {
      let q = supabaseAdmin.from('discussion_posts').select('*').order('created_at', { ascending: false })
      if (payload?.onlyFlagged) q = q.gt('flag_count', 0)
      const { data, error } = await q
      if (error) throw error
      return ok(res, { data })
    }
    if (action === 'list_files') {
      const { data, error } = await supabaseAdmin.from('files').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return ok(res, { data })
    }
    if (action === 'list_requests') {
      const { data, error } = await supabaseAdmin.from('resource_requests').select('*').neq('subject', 'Feedback').order('created_at', { ascending: false })
      if (error) throw error
      return ok(res, { data })
    }
    if (action === 'list_feedback') {
      const { data, error } = await supabaseAdmin.from('feedback').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return ok(res, { data })
    }
    if (action === 'list_reports') {
      const { data, error } = await supabaseAdmin.from('reports').select('*')
        .order('resolved_at', { ascending: true, nullsFirst: true }).order('created_at', { ascending: true })
      if (error) throw error
      return ok(res, { data })
    }
    if (action === 'list_study_links') {
      const { data, error } = await supabaseAdmin.from('study_links').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return ok(res, { data })
    }
    if (action === 'list_archive') {
      const { data, error } = await supabaseAdmin.from('admin_archive').select('*').order('archived_at', { ascending: false }).limit(500)
      if (error) throw error
      return ok(res, { data })
    }

    // ---------------- moderation that doesn't remove anything ----------------
    if (action === 'unhide_post') {
      const { error } = await supabaseAdmin.from('discussion_posts').update({ hidden: false, flag_count: 0 }).eq('id', payload.id)
      if (error) throw error
      return ok(res)
    }
    if (action === 'hide_post') {
      const { error } = await supabaseAdmin.from('discussion_posts').update({ hidden: true }).eq('id', payload.id)
      if (error) throw error
      return ok(res)
    }
    if (action === 'resolve_report') {
      const { error } = await supabaseAdmin.from('reports').update({ resolved_at: new Date().toISOString() }).eq('id', payload.id)
      if (error) throw error
      return ok(res)
    }

    // ---------------- removals: archive first, then delete ----------------
    if (action === 'delete_post') {
      const found = await postWithReplies(payload.id)
      if (!found) return ok(res)
      await archiveRow('discussion_post', found.root.id, found.root, found.replies,
        `${found.root.author_name}: ${short(found.root.topic || found.root.body)}${found.replies.length ? ` (+${found.replies.length} replies)` : ''}`)
      const { error } = await supabaseAdmin.from('discussion_posts').delete().eq('id', payload.id)
      if (error) throw error
      return ok(res)
    }

    if (action === 'delete_file') {
      // payload.id archives one file; payload.batch_id archives a whole upload batch.
      let q = supabaseAdmin.from('files').select('*')
      q = payload.batch_id ? q.eq('batch_id', payload.batch_id) : q.eq('id', payload.id)
      const { data: rows, error: findErr } = await q
      if (findErr) throw findErr
      for (const row of rows || []) {
        await archiveRow('file', row.id, row, [], `${row.title} (${row.grade}, ${row.subject}) by ${row.uploader_name} [${row.file_role || 'paper'}]`)
      }
      const ids = (rows || []).map((r) => r.id)
      if (ids.length) {
        // Only the database row goes. The PDF itself stays in storage so a restore brings everything back.
        const { error } = await supabaseAdmin.from('files').delete().in('id', ids)
        if (error) throw error
      }
      return ok(res)
    }

    if (action === 'delete_request') {
      const { data: row } = await supabaseAdmin.from('resource_requests').select('*').eq('id', payload.id).maybeSingle()
      if (!row) return ok(res)
      const { data: comments } = await supabaseAdmin.from('request_comments').select('*').eq('request_id', row.id)
      await archiveRow('resource_request', row.id, row, comments || [], `${row.subject}: ${short(row.description)}${comments?.length ? ` (+${comments.length} comments)` : ''}`)
      const { error } = await supabaseAdmin.from('resource_requests').delete().eq('id', payload.id)
      if (error) throw error
      return ok(res)
    }

    if (action === 'delete_feedback') {
      const { data: row } = await supabaseAdmin.from('feedback').select('*').eq('id', payload.id).maybeSingle()
      if (!row) return ok(res)
      await archiveRow('feedback', row.id, row, [], short(row.message))
      const { error } = await supabaseAdmin.from('feedback').delete().eq('id', payload.id)
      if (error) throw error
      return ok(res)
    }

    if (action === 'delete_study_link') {
      const { data: row } = await supabaseAdmin.from('study_links').select('*').eq('id', payload.id).maybeSingle()
      if (!row) return ok(res)
      await archiveRow('study_link', row.id, row, [], `${row.name} ${row.url}`)
      const { error } = await supabaseAdmin.from('study_links').delete().eq('id', payload.id)
      if (error) throw error
      return ok(res)
    }

    // ---------------- restore from the archive ----------------
    if (action === 'restore_archive') {
      const { data: entry, error: findErr } = await supabaseAdmin.from('admin_archive').select('*').eq('id', payload.id).maybeSingle()
      if (findErr) throw findErr
      if (!entry) return res.status(404).json({ ok: false, error: 'Archive entry not found.' })
      if (entry.restored_at) return res.status(409).json({ ok: false, error: 'Already restored.' })

      const { row, children } = entry.data
      const table = {
        discussion_post: 'discussion_posts', file: 'files', resource_request: 'resource_requests',
        feedback: 'feedback', study_link: 'study_links',
      }[entry.kind]
      if (!table) return res.status(400).json({ ok: false, error: 'Unknown archive type.' })

      const first = await supabaseAdmin.from(table).insert(row)
      if (first.error) throw first.error
      if (children?.length) {
        const childTable = entry.kind === 'resource_request' ? 'request_comments' : 'discussion_posts'
        // replies were stored parent-first, so inserting in order keeps the foreign keys valid
        for (const child of children) {
          const { error } = await supabaseAdmin.from(childTable).insert(child)
          if (error) throw error
        }
      }
      await supabaseAdmin.from('admin_archive').update({ restored_at: new Date().toISOString() }).eq('id', entry.id)
      return ok(res)
    }

    return res.status(400).json({ ok: false, error: 'Unknown action' })
  } catch (err) {
    console.error('[api/admin]', action, err)
    // Admins are authenticated, so the real reason is safe (and useful) to show them.
    return res.status(500).json({ ok: false, error: err.message || 'Server error' })
  }
}
