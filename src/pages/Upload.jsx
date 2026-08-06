import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { GRADES, SUBJECTS, sha256Hex, containsProfanity, getDeviceId } from '../lib/device'

const CATEGORIES = [
  { value: 'past_paper', label: 'Past paper' },
  { value: 'lesson_slide', label: 'Lesson slide' },
  { value: 'study_guide', label: 'Study guide / tip' },
]

export default function Upload() {
  const [category, setCategory] = useState('past_paper')
  const [grade, setGrade] = useState(GRADES[0])
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [uploaderName, setUploaderName] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)

  function onPick(e) {
    const files = Array.from(e.target.files || [])
    const nonPdf = files.some((f) => f.type !== 'application/pdf')
    if (nonPdf) {
      setStatus('Only PDF files are allowed.')
      setSelectedFiles([])
      return
    }
    setStatus('')
    setSelectedFiles(files)
  }

  async function handleUpload() {
    if (!uploaderName.trim()) return setStatus('Add a display name so people know who made this.')
    if (containsProfanity(uploaderName)) return setStatus('That display name isn\u2019t appropriate — pick another.')
    if (!confirmed) return setStatus('Please confirm this was made by a student before uploading.')
    if (selectedFiles.length === 0) return setStatus('Choose at least one PDF.')

    setBusy(true)
    setStatus('Uploading…')
    let uploaded = 0
    let skipped = 0

    for (const file of selectedFiles) {
      const hash = await sha256Hex(file)
      const { data: existing } = await supabase.from('files').select('id').eq('file_hash', hash).maybeSingle()
      if (existing) {
        skipped++
        continue
      }
      const path = `${category}/${crypto.randomUUID()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('papers').upload(path, file)
      if (uploadError) {
        skipped++
        continue
      }
      const { data: urlData } = supabase.storage.from('papers').getPublicUrl(path)
      await supabase.from('files').insert({
        type: category,
        grade,
        subject,
        title: file.name.replace(/\.pdf$/i, ''),
        file_url: urlData.publicUrl,
        file_hash: hash,
        uploader_name: uploaderName.trim(),
        made_by_student: true,
      })
      uploaded++
    }

    setBusy(false)
    setSelectedFiles([])
    setStatus(
      `Done — ${uploaded} uploaded${skipped ? `, ${skipped} skipped (already exists or failed)` : ''}.`
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl mb-2">Upload</h1>
      <p className="font-body text-sm text-inkSoft mb-8">
        PDF only. Duplicate files are detected automatically and skipped.
      </p>

      <div className="bg-parchmentDark border border-ink/20 shadow-card p-6 space-y-5">
        <div>
          <label className="stamp text-xs text-oxblood block mb-1">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="stamp text-xs text-oxblood block mb-1">Grade</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2">
              {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="stamp text-xs text-oxblood block mb-1">Subject</label>
            <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2">
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="stamp text-xs text-oxblood block mb-1">Your display name</label>
          <input
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            placeholder="e.g. a Grade 10 student"
            className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2"
          />
        </div>
        <div>
          <label className="stamp text-xs text-oxblood block mb-1">Files (PDF, multiple allowed)</label>
          <input type="file" accept="application/pdf" multiple onChange={onPick} className="w-full font-body text-sm" />
        </div>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 accent-library" />
          <span className="font-body text-sm">
            This was made by a student (or, for answer keys, provided by the school).
          </span>
        </label>

        {status && <p className="font-body text-sm text-oxblood">{status}</p>}

        <button
          onClick={handleUpload}
          disabled={busy}
          className="w-full bg-library text-parchment font-body font-medium py-3 shadow-card hover:shadow-cardHover transition-shadow disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Upload'}
        </button>
      </div>
    </div>
  )
}
