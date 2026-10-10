import { createClient } from '@supabase/supabase-js'
import { getMember } from './_lib/security.js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BUCKET = 'papers'

// files.file_url is stored as the full public Supabase URL, e.g.
// https://<ref>.supabase.co/storage/v1/object/public/papers/past_paper/<uuid>-name.pdf
// We only ever had that full URL saved (no separate path column), so we pull
// the storage path back out of it here rather than needing a migration.
function storagePathFromUrl(fileUrl) {
  const marker = `/object/public/${BUCKET}/`
  const i = fileUrl.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(fileUrl.slice(i + marker.length))
}

function safeFilename(title) {
  const cleaned = (title || 'file').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 150)
  return `${cleaned || 'file'}.pdf`
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).send('Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  }

  // Files are only served to someone who has entered a valid access code.
  if (process.env.SUPABASE_JWT_SECRET && !getMember(req)) {
    return res.status(401).send('Please enter your access code on the site first.')
  }

  const id = String(req.query.id || '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) return res.status(400).send('Missing or invalid file id.')

  try {
    const { data: file, error: lookupError } = await supabaseAdmin
      .from('files')
      .select('id, title, file_url, download_count')
      .eq('id', id)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (!file) return res.status(404).send('File not found — it may have been removed.')

    const path = storagePathFromUrl(file.file_url)
    if (!path) return res.status(500).send('Could not resolve this file in storage.')

    const { data: blob, error: downloadError } = await supabaseAdmin.storage.from(BUCKET).download(path)
    if (downloadError) throw downloadError
    const buffer = Buffer.from(await blob.arrayBuffer())

    // Counted server-side now (used to be an anon client-side update, which
    // both relied on a public UPDATE policy and was easy to skip/spoof).
    // Awaited so it actually completes before this function's response ends
    // and the serverless runtime potentially freezes it.
    await supabaseAdmin.from('files').update({ download_count: (file.download_count || 0) + 1 }).eq('id', id)
    // One row per download, so the hub can rank "trending this week". Best-effort:
    // if migration-8 hasn't been run yet this just errors quietly and the download proceeds.
    await supabaseAdmin.from('download_events').insert({ file_id: id })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename(file.title)}"`)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).send(buffer)
  } catch (err) {
    console.error('[api/download]', err)
    return res.status(500).send('Could not download this file. Try again in a moment.')
  }
}
