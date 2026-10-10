import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { GRADES, SUBJECTS } from '../lib/device'
import { groupFiles, roleLabel } from '../lib/batches'

const TYPE_LABELS = {
  past_paper: 'Past paper',
  lesson_slide: 'Lesson slide',
  study_guide: 'Study guide',
}

export default function HomeSearch() {
  const [query, setQuery] = useState('')
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState(null)
  const active = query.trim().length >= 2 || grade || subject

  useEffect(() => {
    if (!active) {
      setResults([])
      return
    }
    let cancelled = false
    const t = setTimeout(async () => {
      setLoading(true)
      let q = supabase.from('files').select('*').order('created_at', { ascending: false }).limit(30)
      if (query.trim().length >= 2) q = q.ilike('title', `%${query.trim()}%`)
      if (grade) q = q.eq('grade', grade)
      if (subject) q = q.eq('subject', subject)
      const { data } = await q
      if (!cancelled) {
        setResults(data || [])
        setLoading(false)
      }
    }, 300)
    return () => { cancelled = true; clearTimeout(t) }
  }, [query, grade, subject, active])

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-3 backdrop-blur-sm">
        <Search size={18} className="text-white/60 shrink-0" aria-hidden="true" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search past papers, slides, study guides…"
          className="flex-1 bg-transparent font-body text-sm text-white placeholder-white/50 outline-none min-w-0"
        />
        {query && (
          <button onClick={() => setQuery('')} aria-label="Clear search" className="text-white/50 hover:text-white/80 shrink-0">
            <X size={16} />
          </button>
        )}
        <select
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="hidden sm:block bg-white/10 border border-white/20 rounded-full font-body text-xs text-white px-3 py-1.5 shrink-0 outline-none"
          style={{ colorScheme: 'dark' }}
        >
          <option value="" className="text-ink">All subjects</option>
          {SUBJECTS.map((s) => <option key={s} value={s} className="text-ink">{s}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={() => setGrade('')}
          className={`font-body text-xs rounded-full px-3 py-1.5 border transition-colors ${
            grade === '' ? 'bg-white text-ink border-white' : 'border-white/25 text-white/70 hover:border-white/50'
          }`}
        >
          All grades
        </button>
        {GRADES.map((g) => (
          <button
            key={g}
            onClick={() => setGrade(grade === g ? '' : g)}
            className={`font-body text-xs rounded-full px-3 py-1.5 border transition-colors ${
              grade === g ? 'bg-white text-ink border-white' : 'border-white/25 text-white/70 hover:border-white/50'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {active && (
        <div className="mt-4 bg-[#0d2438]/95 border border-white/15 rounded-2xl p-3 backdrop-blur-md max-h-96 overflow-y-auto">
          {loading && <p className="font-body text-sm text-white/60 px-2 py-2">Searching…</p>}
          {!loading && results.length === 0 && (
            <p className="font-body text-sm text-white/60 px-2 py-2">Nothing found — try different words, or request it.</p>
          )}
          {!loading && groupFiles(results).slice(0, 8).map((g) => (
            <div key={g.key} className="flex items-center justify-between gap-3 px-2 py-2.5 border-b border-white/10 last:border-0">
              <div className="min-w-0">
                <p className="font-body text-sm text-white truncate">{g.title}</p>
                <p className="font-body text-xs text-white/50">
                  {TYPE_LABELS[g.type]} · {g.grade} · {g.subject}
                </p>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                {g.files.map((f) => (
                  <div key={f.id} className="flex items-center gap-3 justify-end">
                    {g.files.length > 1 && <span className="font-body text-xs text-white/50">{roleLabel(f.role)}</span>}
                    <button onClick={() => setPreview({ id: f.id, title: g.title })} className="font-body text-xs text-white/80 underline">Preview</button>
                    <a href={`/api/download?id=${f.id}`} className="font-body text-xs text-white/80 underline">Download</a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-ink/60 flex items-center justify-center p-4 z-50" onClick={() => setPreview(null)}>
          <div className="bg-parchment w-full max-w-3xl h-[80vh] shadow-card p-3 rounded-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2 px-2">
              <p className="font-display text-lg text-ink">{preview.title}</p>
              <button onClick={() => setPreview(null)} className="font-body text-sm text-ink underline">Close</button>
            </div>
            <iframe title={preview.title} src={`/api/preview?id=${preview.id}`} className="w-full h-[calc(100%-4.5rem)] border border-ink/20 rounded-xl" />
            <p className="font-body text-xs text-white/50 mt-2 px-2">Showing a preview only — download for the full document.</p>
          </div>
        </div>
      )}
    </div>
  )
}
