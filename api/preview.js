import { createClient } from '@supabase/supabase-js'
import { PDFDocument } from 'pdf-lib'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const BUCKET = 'papers'

function storagePathFromUrl(fileUrl) {
  const marker = `/object/public/${BUCKET}/`
  const i = fileUrl.indexOf(marker)
  if (i === -1) return null
  return decodeURIComponent(fileUrl.slice(i + marker.length))
}

export default async function handler(req, res) {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(500).send('Server misconfigured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.')
  }

  const id = req.query.id
  if (!id) return res.status(400).send('Missing file id.')

  try {
    const { data: file, error: lookupError } = await supabaseAdmin
      .from('files')
      .select('file_url, title')
      .eq('id', id)
      .maybeSingle()
    if (lookupError) throw lookupError
    if (!file) return res.status(404).send('File not found — it may have been removed.')

    const path = storagePathFromUrl(file.file_url)
    if (!path) return res.status(500).send('Could not resolve this file in storage.')

    const { data: blob, error: downloadError } = await supabaseAdmin.storage.from(BUCKET).download(path)
    if (downloadError) throw downloadError
    const bytes = new Uint8Array(await blob.arrayBuffer())

    const src = await PDFDocument.load(bytes, { ignoreEncryption: true })
    const total = src.getPageCount()
    if (total === 0) return res.status(422).send('This file has no pages to preview.')

    // Cap the preview at 2 pages, or 20% of the document, whichever is
    // fewer — but never 0, so even a short document still shows something.
    const pageCount = Math.max(1, Math.min(2, Math.ceil(total * 0.2), total))

    const out = await PDFDocument.create()
    const indices = Array.from({ length: pageCount }, (_, i) => i)
    const copiedPages = await out.copyPages(src, indices)
    copiedPages.forEach((p) => out.addPage(p))
    const outBytes = await out.save()

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'inline; filename="preview.pdf"')
    res.setHeader('Cache-Control', 'public, max-age=300')
    return res.status(200).send(Buffer.from(outBytes))
  } catch (err) {
    console.error('[api/preview]', err)
    return res.status(500).send('Could not generate a preview for this file.')
  }
}
