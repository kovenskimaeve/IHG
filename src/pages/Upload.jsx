import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { GRADES, SUBJECTS, sha256Hex, containsProfanity } from '../lib/device'
import { GRADE_BANDS, SUBJECTS_BY_BAND, GRADE9_COURSES } from '../lib/lessonFolders'

const CATEGORIES = [
  { value: 'past_paper', label: 'Past paper' },
  { value: 'lesson_slide', label: 'Lesson slide' },
  { value: 'study_guide', label: 'Study guide / tip' },
]

const RULES = [
  { ok: false, text: "No copying someone else's personal essay or assignment" },
  { ok: false, text: 'No posting upcoming test questions or live assessment material' },
  { ok: true, text: 'Answer keys are fine — just label them clearly' },
  { ok: true, text: 'School-provided official papers are welcome' },
  { ok: true, text: "Guides from other schools, YouTube, or creators are fine too" },
  { ok: true, text: 'You can attach more than one file to a single upload' },
]

export default function Upload() {
  const [category, setCategory] = useState('past_paper')
  const [grade, setGrade] = useState(GRADES[0])
  const [subject, setSubject] = useState(SUBJECTS[0])
  const [band, setBand] = useState(GRADE_BANDS[0].id)
  const [bandSubject, setBandSubject] = useState(SUBJECTS_BY_BAND[GRADE_BANDS[0].id][0])
  const [course, setCourse] = useState(GRADE9_COURSES[0])
  const [uploaderName, setUploaderName] = useState('')
  const [title, setTitle] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [myUploads, setMyUploads] = useState(0)
  const [totalShared, setTotalShared] = useState(null)

  useEffect(() => {
    setMyUploads(Number(localStorage.getItem('ihg_upload_count') || 0))
    supabase.from('files').select('id', { count: 'exact', head: true }).then(({ count }) => {
      if (typeof count === 'number') setTotalShared(count)
    })
  }, [])

  const [useCourse, setUseCourse] = useState(false)
  const isLessonSlide = category === 'lesson_slide'
  const effectiveGrade = isLessonSlide ? band : grade
  const effectiveSubject = isLessonSlide
    ? (bandSubject === 'Courses' ? course : bandSubject)
    : (grade === 'Grade 9' && useCourse ? course : subject)

  function onPick(e) {
    const files = Array.from(e.target.files || [])
    const nonPdf = files.some((f) => f.type !== 'application/pdf')
    if (nonPdf) {
      setStatus('Only PDF files are allowed.')
      setSelectedFiles([])
      return
    }
    const tooSmall = files.some((f) => f.size < 3000)
    if (tooSmall) {
      setStatus('That file looks empty or almost empty — please check it actually has content before uploading.')
      setSelectedFiles([])
      return
    }
    setStatus('')
    setSelectedFiles(files)
  }

  async function handleUpload() {
    if (!title.trim()) return setStatus('Add a title for this resource.')
    const finalName = uploaderName.trim() || 'Anonymous'
    if (containsProfanity(finalName)) return setStatus('That display name isn\u2019t appropriate — pick another.')
    if (!confirmed) return setStatus('Please confirm this follows the upload rules before submitting.')
    if (selectedFiles.length === 0) return setStatus('Choose at least one PDF.')

    setBusy(true)
    setStatus('Uploading…')
    let uploaded = 0
    let skipped = 0
    const errors = []

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const hash = await sha256Hex(file)

      const { data: existing, error: lookupError } = await supabase
        .from('files').select('id').eq('file_hash', hash).maybeSingle()
      if (lookupError) {
        skipped++
        errors.push(`Lookup failed: ${lookupError.message}`)
        continue
      }
      if (existing) {
        skipped++
        errors.push(`"${file.name}" already exists.`)
        continue
      }

      const path = `${category}/${crypto.randomUUID()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('papers').upload(path, file)
      if (uploadError) {
        skipped++
        errors.push(`Storage upload failed: ${uploadError.message}`)
        continue
      }

      const { data: urlData } = supabase.storage.from('papers').getPublicUrl(path)
      const fileTitle = title.trim()
        ? (selectedFiles.length > 1 ? `${title.trim()} (${i + 1})` : title.trim())
        : file.name.replace(/\.pdf$/i, '')

      const { error: insertError } = await supabase.from('files').insert({
        type: category,
        grade: effectiveGrade,
        subject: effectiveSubject,
        title: fileTitle,
        file_url: urlData.publicUrl,
        file_hash: hash,
        uploader_name: finalName,
        made_by_student: true,
      })
      if (insertError) {
        skipped++
        errors.push(`Database save failed: ${insertError.message}`)
        continue
      }
      uploaded++
    }

    setBusy(false)
    setSelectedFiles([])
    if (uploaded > 0) {
      const next = myUploads + uploaded
      setMyUploads(next)
      localStorage.setItem('ihg_upload_count', String(next))
      setTotalShared((t) => (typeof t === 'number' ? t + uploaded : t))
    }
    const summary = `Done — ${uploaded} uploaded${skipped ? `, ${skipped} skipped` : ''}.`
    setStatus(errors.length ? `${summary} ${errors[0]}` : summary)
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-parchmentDark border border-ink/10 shadow-card p-4">
          <p className="stamp text-xs mb-1">Your uploads</p>
          <p className="font-display text-2xl">{myUploads}</p>
        </div>
        <div className="bg-parchmentDark border border-ink/10 shadow-card p-4">
          <p className="stamp text-xs mb-1">Total shared</p>
          <p className="font-display text-2xl">{totalShared ?? '—'}</p>
        </div>
      </div>

      <h1 className="font-display text-4xl mb-2">Upload a resource</h1>
      <p className="font-body text-sm text-inkSoft mb-6">Share your study materials with the ISF community.</p>

      <div className="bg-parchmentDark border border-ink/10 shadow-card p-5 mb-6">
        <p className="stamp text-xs mb-3">Upload rules</p>
        <ul className="space-y-2">
          {RULES.map((r) => (
            <li key={r.text} className="flex items-start gap-2 font-body text-sm">
              <span className={r.ok ? 'text-library font-medium' : 'text-oxblood font-medium'}>{r.ok ? '✓' : '✕'}</span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-parchmentDark border border-ink/10 shadow-card p-6 space-y-5">
        <p className="stamp text-xs">Resource details</p>

        <div>
          <label className="font-body text-xs text-inkSoft block mb-1">Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full font-body text-sm border border-ink/20 bg-parchment px-3 py-2">
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        {isLessonSlide ? (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-body text-xs text-inkSoft block mb-1">Grade</label>
              <select
                value={band}
                onChange={(e) => { setBand(e.target.value); setBandSubject(SUBJECTS_BY_BAND[e.target.value][0]) }}
                className="w-full font-body text-sm border border-ink/20 bg-parchment px-3 py-2"
              >
                {GRADE_BANDS.map((b) => <option key={b.id} value={b.id}>{b.id}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs text-inkSoft block mb-1">Subject</label>
              <select value={bandSubject} onChange={(e) => setBandSubject(e.target.value)} className="w-full font-body text-sm border border-ink/20 bg-parchment px-3 py-2">
                {SUBJECTS_BY_BAND[band].map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {bandSubject === 'Courses' && (
              <div className="col-span-2">
                <label className="font-body text-xs text-inkSoft block mb-1">Course</label>
                <select value={course} onChange={(e) => setCourse(e.target.value)} className="w-full font-body text-sm border border-ink/20 bg-parchment px-3 py-2">
                  {GRADE9_COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-body text-xs text-inkSoft block mb-1">Grade</label>
              <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full font-body text-sm border border-ink/20 bg-parchment px-3 py-2">
                {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div>
              <label className="font-body text-xs text-inkSoft block mb-1">Subject</label>
              <select
                value={useCourse ? 'Others' : subject}
                onChange={(e) => {
                  if (e.target.value === 'Others') setUseCourse(true)
                  else { setUseCourse(false); setSubject(e.target.value) }
                }}
                className="w-full font-body text-sm border border-ink/20 bg-parchment px-3 py-2"
              >
                {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                {grade === 'Grade 9' && <option value="Others">Others (pick a Grade 9 course)</option>}
              </select>
            </div>
            {grade === 'Grade 9' && useCourse && (
              <div className="col-span-2">
                <label className="font-body text-xs text-inkSoft block mb-1">Course</label>
                <select value={course} onChange={(e) => setCourse(e.target.value)} className="w-full font-body text-sm border border-ink/20 bg-parchment px-3 py-2">
                  {GRADE9_COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            )}
          </div>
        )}

        <div>
          <label className="font-body text-xs text-inkSoft block mb-1">Title *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. G10 Maths Unit 3 Practice Paper"
            className="w-full font-body text-sm border border-ink/20 bg-parchment px-3 py-2"
          />
        </div>

        <div>
          <label className="font-body text-xs text-inkSoft block mb-1">Uploading as</label>
          <input
            value={uploaderName}
            onChange={(e) => setUploaderName(e.target.value)}
            placeholder="e.g. a Grade 10 student, or leave blank for Anonymous"
            className="w-full font-body text-sm border border-ink/20 bg-parchment px-3 py-2"
          />
        </div>

        <div>
          <label className="font-body text-xs text-inkSoft block mb-1">Files (PDF, multiple allowed)</label>
          <label className="flex flex-col items-center justify-center gap-1 border border-dashed border-ink/25 bg-parchment px-3 py-8 cursor-pointer text-center">
            <span className="font-body text-sm text-library">Click to add files</span>
            <span className="font-body text-xs text-inkSoft">PDF only</span>
            <input type="file" accept="application/pdf" multiple onChange={onPick} className="hidden" />
          </label>
          {selectedFiles.length > 0 && (
            <p className="font-body text-xs text-inkSoft mt-2">{selectedFiles.length} file(s) selected</p>
          )}
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-1 accent-library" />
          <span className="font-body text-sm">
            This follows the upload rules above.
          </span>
        </label>

        <p className="font-body text-xs text-inkSoft bg-parchment border border-ink/10 p-3">
          Uploads are checked against a simple word filter and duplicate-file check automatically.
          Anything reported by another student goes to a human moderator — nothing gets auto-banned off one flag.
        </p>

        {status && <p className="font-body text-sm text-oxblood">{status}</p>}

        <button
          onClick={handleUpload}
          disabled={busy}
          className="w-full bg-library text-parchment font-body font-medium py-3 shadow-card hover:shadow-cardHover transition-shadow disabled:opacity-50"
        >
          {busy ? 'Uploading…' : 'Submit resource'}
        </button>
      </div>
    </div>
  )
}
