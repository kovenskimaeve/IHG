import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { GRADE_BANDS, SUBJECTS_BY_BAND, GRADE9_COURSES } from '../lib/lessonFolders'
import IndexCard from '../components/IndexCard'
import { groupFiles } from '../lib/batches'

function FolderTile({ title, subtitle, onClick }) {
  return (
    <button
      onClick={onClick}
      className="tilt-card text-left bg-parchmentDark border border-ink/10 shadow-card p-5 flex items-center gap-4"
    >
      <div className="w-11 h-11 rounded-full bg-parchment border border-ink/10 flex items-center justify-center shrink-0" aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#4C6B87" strokeWidth="1.6">
          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
      </div>
      <div>
        <p className="font-display text-lg leading-snug">{title}</p>
        {subtitle && <p className="font-body text-xs text-inkSoft">{subtitle}</p>}
      </div>
    </button>
  )
}

export default function LessonSlides() {
  const [band, setBand] = useState(null)
  const [subject, setSubject] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    if (!band || !subject) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('files')
        .select('*')
        .eq('type', 'lesson_slide')
        .eq('grade', band)
        .eq('subject', subject)
        .order('created_at', { ascending: false })
      if (!cancelled) {
        setFiles(data || [])
        setLoading(false)
      }
    }
    load()
    const sub = supabase
      .channel(`lesson-slides-${band}-${subject}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `subject=eq.${subject}` }, load)
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(sub) }
  }, [band, subject])

  function goHome() { setBand(null); setSubject(null) }
  function goBand() { setSubject(null) }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl mb-2">Lesson slides</h1>
      <p className="font-body text-sm text-inkSoft mb-6">
        Browse and download lesson slides by grade and subject. PDF files only.
      </p>

      <div className="flex items-center gap-2 font-body text-sm text-inkSoft mb-6">
        <button onClick={goHome} className={band ? 'underline' : 'text-ink font-medium'}>Lesson slides</button>
        {band && (
          <>
            <span>/</span>
            <button onClick={goBand} className={subject ? 'underline' : 'text-ink font-medium'}>{band}</button>
          </>
        )}
        {subject && (
          <>
            <span>/</span>
            <span className="text-ink font-medium">{subject === 'Courses' ? 'Courses' : subject}</span>
          </>
        )}
      </div>

      {!band && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GRADE_BANDS.map((b) => (
            <FolderTile key={b.id} title={b.id} subtitle={b.subtitle} onClick={() => setBand(b.id)} />
          ))}
        </div>
      )}

      {band && !subject && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {SUBJECTS_BY_BAND[band].map((s) => (
            <FolderTile
              key={s}
              title={s}
              subtitle={s === 'Courses' ? 'Electives and programme courses' : null}
              onClick={() => setSubject(s)}
            />
          ))}
        </div>
      )}

      {band && subject === 'Courses' && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {GRADE9_COURSES.map((c) => (
            <FolderTile key={c} title={c} onClick={() => setSubject(c)} />
          ))}
        </div>
      )}

      {band && subject && subject !== 'Courses' && (
        loading ? (
          <p className="font-body text-inkSoft">Loading…</p>
        ) : files.length === 0 ? (
          <p className="font-body text-inkSoft">Nothing here yet — be the first to upload one.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groupFiles(files).map((g) => (
              <IndexCard
                key={g.key}
                title={g.title}
                grade={g.grade}
                subject={g.subject}
                meta={`Uploaded by ${g.uploader_name} · ${g.download_count} downloads`}
                files={g.files}
                onPreview={(id) => setPreview({ id, title: g.title })}
              />
            ))}
          </div>
        )
      )}

      {preview && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50" onClick={() => setPreview(null)}>
          <div className="bg-parchment w-full max-w-3xl h-[80vh] shadow-card p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2 px-2">
              <p className="font-display text-lg">{preview.title}</p>
              <button onClick={() => setPreview(null)} className="font-body text-sm underline">Close</button>
            </div>
            <iframe title={preview.title} src={`/api/preview?id=${preview.id}`} className="w-full h-[calc(100%-4.5rem)] border border-ink/20" />
            <p className="font-body text-xs text-inkSoft mt-2 px-2">Showing a preview only — download for the full document.</p>
          </div>
        </div>
      )}
    </div>
  )
}
