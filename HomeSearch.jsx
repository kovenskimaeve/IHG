import { useEffect, useState } from 'react'
import { Search, X } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { GRADES } from '../lib/device'
import SubjectOptions from './SubjectOptions'

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
      let q = supabase.from('files').select('*').order('created_at', { ascending: false }).limit(8)
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

  async function handleDownload(file) {
    await supabase.from('files').update({ download_count: (file.download_count || 0) + 1 }).eq('id', file.id)
    window.open(file.file_url, '_blank')
  }

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
          <SubjectOptions grade={grade} optionClassName="text-ink" />
        </select>
      </div>

      <div className="flex flex-wrap gap-2 mt-3">
        <button
          onClick={() => { setGrade(''); setSubject('') }}
          className={`font-body text-xs rounded-full px-3 py-1.5 border transition-colors ${
            grade === '' ? 'bg-white text-ink border-white' : 'border-white/25 text-white/70 hover:border-white/50'
          }`}
        >
          All grades
        </button>
        {GRADES.map((g) => (
          <button
            key={g}
            onClick={() => { setGrade(grade === g ? '' : g); setSubject('') }}
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
          {!loading && results.map((f) => (
            <div key={f.id} className="flex items-center justify-between gap-3 px-2 py-2.5 border-b border-white/10 last:border-0">
              <div className="min-w-0">
                <p className="font-body text-sm text-white truncate">{f.title}</p>
                <p className="font-body text-xs text-white/50">
                  {TYPE_LABELS[f.type]} · {f.grade} · {f.subject}
                </p>
              </div>
              <div className="flex gap-3 shrink-0">
                <button onClick={() => setPreview(f)} className="font-body text-xs text-white/80 underline">Preview</button>
                <button onClick={() => handleDownload(f)} className="font-body text-xs text-white/80 underline">Download</button>
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
            <iframe title={preview.title} src={preview.file_url} className="w-full h-[calc(100%-2rem)] border border-ink/20 rounded-xl" />
          </div>
        </div>
      )}
    </div>
  )
}
