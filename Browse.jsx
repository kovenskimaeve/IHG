import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { GRADES } from '../lib/device'
import { PAPER_TYPES, paperTypeLabel } from '../lib/lessonFolders'
import IndexCard from '../components/IndexCard'
import SubjectOptions from '../components/SubjectOptions'

const TITLES = {
  past_paper: 'Past papers',
  lesson_slide: 'Lesson slides',
  study_guide: 'Study guides & tips',
}

export default function Browse({ category }) {
  const [grade, setGrade] = useState('')
  const [subject, setSubject] = useState('')
  const [paperType, setPaperType] = useState('')
  const [query, setQuery] = useState('')
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [preview, setPreview] = useState(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      let q = supabase.from('files').select('*').eq('type', category).order('created_at', { ascending: false })
      if (grade) q = q.eq('grade', grade)
      if (subject) q = q.eq('subject', subject)
      if (category === 'past_paper' && paperType) q = q.eq('paper_type', paperType)
      const { data } = await q
      if (!cancelled) {
        setFiles(data || [])
        setLoading(false)
      }
    }
    load()
    // Re-fetch whenever any file row changes (new upload, download count bump,
    // admin deletion) so this list updates live, no refresh needed.
    const sub = supabase
      .channel(`files-${category}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'files', filter: `type=eq.${category}` }, load)
      .subscribe()
    return () => { cancelled = true; supabase.removeChannel(sub) }
  }, [category, grade, subject, paperType])

  const filtered = useMemo(() => {
    if (!query.trim()) return files
    const q = query.toLowerCase()
    return files.filter((f) => f.title.toLowerCase().includes(q))
  }, [files, query])

  async function handleDownload(file) {
    await supabase.from('files').update({ download_count: (file.download_count || 0) + 1 }).eq('id', file.id)
    window.open(file.file_url, '_blank')
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl mb-6">{TITLES[category]}</h1>

      <div className="flex flex-wrap gap-3 mb-8">
        <select
          value={grade}
          onChange={(e) => { setGrade(e.target.value); setSubject('') }}
          className="font-body text-sm border border-ink/25 bg-parchment px-3 py-2"
        >
          <option value="">All grades</option>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="font-body text-sm border border-ink/25 bg-parchment px-3 py-2">
          <option value="">All subjects</option>
          <SubjectOptions grade={grade} />
        </select>
        {category === 'past_paper' && (
          <select value={paperType} onChange={(e) => setPaperType(e.target.value)} className="font-body text-sm border border-ink/25 bg-parchment px-3 py-2">
            <option value="">All paper types</option>
            {PAPER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        )}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title..."
          className="font-body text-sm border border-ink/25 bg-parchment px-3 py-2 flex-1 min-w-[180px]"
        />
      </div>

      {loading ? (
        <p className="font-body text-inkSoft">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="font-body text-inkSoft">Nothing here yet — be the first to upload one.</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((f) => (
            <IndexCard
              key={f.id}
              title={f.title}
              grade={f.grade}
              subject={f.subject}
              badge={f.type === 'past_paper' ? paperTypeLabel(f) : null}
              meta={`Uploaded by ${f.uploader_name} · ${f.download_count || 0} downloads`}
              onPreview={() => setPreview(f)}
              onDownload={() => handleDownload(f)}
            />
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50" onClick={() => setPreview(null)}>
          <div className="bg-parchment w-full max-w-3xl h-[80vh] shadow-card p-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2 px-2">
              <p className="font-display text-lg">{preview.title}</p>
              <button onClick={() => setPreview(null)} className="font-body text-sm underline">Close</button>
            </div>
            <iframe title={preview.title} src={preview.file_url} className="w-full h-[calc(100%-2rem)] border border-ink/20" />
          </div>
        </div>
      )}
    </div>
  )
}
