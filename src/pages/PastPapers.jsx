import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { GRADES, SUBJECTS } from '../lib/device'
import { GRADE9_COURSES } from '../lib/lessonFolders'
import { groupFiles, roleLabel } from '../lib/batches'

// Four pastel "compartments", cycled by index so neighboring cards never
// repeat the same fill — like the actual sectioned trays a bento box has.
const FILLS = ['bg-bentoBlush', 'bg-bentoMint', 'bg-bentoButter', 'bg-bentoSky']

function BentoFileCard({ file, index, onPreview }) {
  // `file` is one upload batch: a paper, and often its answers, on a single card
  return (
    <div
      className={`relative rounded-3xl p-5 shadow-bento hover:shadow-bentoHover transition-shadow ${FILLS[index % FILLS.length]}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="w-2.5 h-2.5 rounded-full bg-bentoStamp/70 mt-1.5" aria-hidden="true" />
        <span className="font-body text-[11px] rounded-full bg-bentoBox/70 text-bentoInk px-2.5 py-1">
          {file.grade}
        </span>
      </div>

      <h3 className="font-display text-lg leading-snug text-bentoInk mb-1">{file.title}</h3>
      <p className="font-body text-xs text-bentoInkSoft mb-4">{file.subject}</p>

      <div className="border-t border-dashed border-bentoWood/30 pt-3 mb-4">
        <p className="font-body text-[11px] text-bentoInkSoft">
          Shared by {file.uploader_name} · {file.download_count} downloads
        </p>
      </div>

      <div className="space-y-2">
        {file.files.map((f) => (
          <div key={f.id} className="flex items-center gap-2">
            {file.files.length > 1 && <span className="font-body text-[11px] text-bentoInk w-16">{roleLabel(f.role)}</span>}
            <button
              onClick={() => onPreview(f.id)}
              className="font-body text-xs rounded-full border border-bentoWood/40 text-bentoInk px-3.5 py-1.5 hover:bg-bentoBox/50 transition-colors"
            >
              Preview
            </button>
            <a
              href={`/api/download?id=${f.id}`}
              className="font-body text-xs rounded-full bg-bentoStamp text-bentoCream px-3.5 py-1.5 hover:opacity-90 transition-opacity"
            >
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PastPapers() {
  // The Past Papers hub links here with ?grade=...&subject=... pre-chosen.
  const [params] = useSearchParams()
  const [grade, setGrade] = useState(params.get('grade') || '')
  const [subject, setSubject] = useState(params.get('subject') || '')
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let q = supabase.from('files').select('*').eq('type', 'past_paper').order('created_at', { ascending: false })
      if (grade) q = q.eq('grade', grade)
      if (subject) q = q.eq('subject', subject)
      const { data } = await q
      if (!cancelled) {
        setFiles(data || [])
        setLoading(false)
      }
    }
    load()
    const sub = supabase
      .channel('files-past_paper')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: 'type=eq.past_paper' }, load)
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(sub) }
  }, [grade, subject])

  const filtered = useMemo(() => {
    if (!query.trim()) return files
    const q = query.toLowerCase()
    return files.filter((f) => f.title.toLowerCase().includes(q))
  }, [files, query])

  return (
    <div className="bg-bentoCream min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-3 h-3 rounded-full bg-bentoStamp" aria-hidden="true" />
          <p className="font-body text-xs text-bentoInkSoft tracking-wide">Packed fresh by your classmates</p>
        </div>
        <h1 className="font-display text-4xl text-bentoInk mb-6">Past papers</h1>

        <div className="flex flex-wrap gap-3 mb-8 bg-bentoBox rounded-2xl shadow-bento p-3">
          <select
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="font-body text-sm rounded-full border border-bentoWood/30 bg-bentoCream text-bentoInk px-3 py-2"
          >
            <option value="">All grades</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="font-body text-sm rounded-full border border-bentoWood/30 bg-bentoCream text-bentoInk px-3 py-2"
          >
            <option value="">All subjects</option>
            <optgroup label="Subjects">
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </optgroup>
            <optgroup label="Grade 9 courses">
              {GRADE9_COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          </select>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title..."
            className="font-body text-sm rounded-full border border-bentoWood/30 bg-bentoCream text-bentoInk px-3 py-2 flex-1 min-w-[180px]"
          />
        </div>

        {loading ? (
          <p className="font-body text-bentoInkSoft">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="font-body text-bentoInkSoft">Nothing here yet — be the first to upload one.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {groupFiles(filtered).map((g, i) => (
              <BentoFileCard key={g.key} file={g} index={i} onPreview={(id) => setPreview({ id, title: g.title })} />
            ))}
          </div>
        )}

        {preview && (
          <div className="fixed inset-0 bg-bentoInk/40 flex items-center justify-center p-4 z-50" onClick={() => setPreview(null)}>
            <div className="bg-bentoBox w-full max-w-3xl h-[80vh] shadow-bento rounded-3xl p-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-2 px-1">
                <p className="font-display text-lg text-bentoInk">{preview.title}</p>
                <button onClick={() => setPreview(null)} className="font-body text-sm text-bentoStamp underline">Close</button>
              </div>
              <iframe title={preview.title} src={`/api/preview?id=${preview.id}`} className="w-full h-[calc(100%-4.5rem)] rounded-2xl border border-bentoWood/20" />
              <p className="font-body text-xs text-bentoInkSoft mt-2 px-1">Showing a preview only — download for the full document.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
