import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { SUBJECTS, sha256Hex, containsProfanity } from '../lib/device'

// MYP runs Grade 6-10; Grade 11 (DP) is intentionally not part of this hub.
const MYP_GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']
const gradeNum = (g) => g.replace('Grade ', '')

const CSS = `
.hub-grid{display:grid;gap:14px;grid-template-columns:repeat(4,minmax(0,1fr));
  grid-template-areas:"ladder ladder ladder ladder" "upload upload trending surprise" "upload upload stats needs" "cloud cloud cloud cloud"}
.hub-ladder{grid-area:ladder}.hub-upload{grid-area:upload}.hub-trending{grid-area:trending}
.hub-surprise{grid-area:surprise}.hub-stats{grid-area:stats}.hub-needs{grid-area:needs}.hub-cloud{grid-area:cloud}
@media (max-width:899px){.hub-grid{display:flex;flex-direction:column}}
.hub-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.hub-tile{transition:filter .25s ease,opacity .25s ease,transform .25s ease,background-color .25s ease,border-color .25s ease}
.hub-dim{filter:blur(6px);opacity:.45;pointer-events:none}
.hub-upload-live{transform:scale(1.03);background-color:#F0DCC2 !important;border-color:#D1654A !important;z-index:5}
.hub-stat-label{opacity:0;transition:opacity .25s ease}
.hub-stat:hover .hub-stat-label,.hub-stat:focus-within .hub-stat-label{opacity:1}
.hub-flip{perspective:900px}
.hub-flip-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .5s ease}
.hub-flip-inner.flipped{transform:rotateY(180deg)}
.hub-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.hub-back{transform:rotateY(180deg)}
@media (prefers-reduced-motion:reduce){.hub-tile,.hub-flip-inner,.hub-stat-label{transition:none}}
`

function BentoTrayIcon({ className = '' }) {
  // An empty bento tray: one tall compartment, two stacked on the right.
  return (
    <svg viewBox="0 0 120 84" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="4" width="112" height="76" rx="14" />
      <path d="M60 4v76" />
      <path d="M60 42h56" />
    </svg>
  )
}

function DieIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
      <rect x="5" y="5" width="30" height="30" rx="8" />
      <circle cx="14" cy="14" r="1.6" fill="currentColor" />
      <circle cx="26" cy="26" r="1.6" fill="currentColor" />
      <circle cx="20" cy="20" r="1.6" fill="currentColor" />
    </svg>
  )
}

function LidIcon({ className = '' }) {
  // A bento lid lifting off its box.
  return (
    <svg viewBox="0 0 40 32" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 10 L34 4 L36 10 L8 16 Z" />
      <path d="M8 20h26v8a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z" />
    </svg>
  )
}

const tile = 'hub-tile rounded-3xl border border-bentoWood/25 bg-bentoBox p-5'

export default function PastPapersHub() {
  const navigate = useNavigate()
  const [papers, setPapers] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const [selGrade, setSelGrade] = useState('')
  const [selSubject, setSelSubject] = useState('')

  // upload tile
  const [dragActive, setDragActive] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [files, setFiles] = useState([])
  const [upGrade, setUpGrade] = useState('')
  const [upSubject, setUpSubject] = useState('')
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const uploadRef = useRef(null)
  const inputRef = useRef(null)

  // surprise tile
  const [rolled, setRolled] = useState(null)
  const [flipped, setFlipped] = useState(false)

  const load = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [p, e] = await Promise.all([
      supabase
        .from('files')
        .select('id, title, grade, subject, uploader_name, download_count, created_at')
        .eq('type', 'past_paper'),
      supabase.from('download_events').select('file_id').gte('created_at', weekAgo),
    ])
    setPapers(p.data || [])
    setEvents(e.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ---------- derived data ----------
  const mypPapers = useMemo(() => papers.filter((f) => MYP_GRADES.includes(f.grade)), [papers])

  const gradeCounts = useMemo(() => {
    const c = Object.fromEntries(MYP_GRADES.map((g) => [g, 0]))
    mypPapers.forEach((f) => { c[f.grade]++ })
    return c
  }, [mypPapers])

  const subjectCounts = useMemo(() => {
    const c = Object.fromEntries(SUBJECTS.map((s) => [s, 0]))
    mypPapers.forEach((f) => { if (c[f.subject] !== undefined) c[f.subject]++ })
    return c
  }, [mypPapers])

  const trending = useMemo(() => {
    const tally = {}
    events.forEach((ev) => { tally[ev.file_id] = (tally[ev.file_id] || 0) + 1 })
    const byId = Object.fromEntries(papers.map((f) => [f.id, f]))
    return Object.entries(tally)
      .filter(([id]) => byId[id])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, n]) => ({ ...byId[id], weekCount: n }))
  }, [events, papers])

  const totalDownloads = useMemo(() => papers.reduce((s, f) => s + (f.download_count || 0), 0), [papers])
  const subjectsCovered = useMemo(() => Object.values(subjectCounts).filter((n) => n > 0).length, [subjectCounts])

  // grade x subject combos that have nothing yet; sampled once per data load
  const gaps = useMemo(() => {
    const have = new Set(mypPapers.map((f) => `${f.grade}|${f.subject}`))
    const all = []
    MYP_GRADES.forEach((g) => SUBJECTS.forEach((s) => { if (!have.has(`${g}|${s}`)) all.push({ g, s }) }))
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(0, 6)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mypPapers.length])

  const subjectStep = (n) => {
    const max = Math.max(1, ...Object.values(subjectCounts))
    const r = n / max
    return r > 0.66 ? 3 : r > 0.33 ? 2 : 1
  }

  // ---------- upload ----------
  function acceptFiles(list) {
    const picked = Array.from(list || [])
    if (picked.length === 0) return
    if (picked.some((f) => f.type !== 'application/pdf')) {
      setFormOpen(true)
      setStatus('Only PDF files are allowed.')
      return
    }
    if (picked.some((f) => f.size < 3000)) {
      setFormOpen(true)
      setStatus('That file looks empty or almost empty. Check it has content before uploading.')
      return
    }
    setStatus('')
    setFiles(picked)
    setFormOpen(true)
  }

  // page-wide drop zone: a counter avoids flicker from nested dragenter/dragleave
  useEffect(() => {
    let depth = 0
    const hasFiles = (e) => Array.from(e.dataTransfer?.types || []).includes('Files')
    const enter = (e) => { if (!hasFiles(e)) return; e.preventDefault(); depth++; setDragActive(true) }
    const over = (e) => { if (hasFiles(e)) e.preventDefault() }
    const leave = (e) => { if (!hasFiles(e)) return; depth = Math.max(0, depth - 1); if (depth === 0) setDragActive(false) }
    const drop = (e) => {
      if (!hasFiles(e)) return
      e.preventDefault()
      depth = 0
      setDragActive(false)
      acceptFiles(e.dataTransfer.files)
    }
    window.addEventListener('dragenter', enter)
    window.addEventListener('dragover', over)
    window.addEventListener('dragleave', leave)
    window.addEventListener('drop', drop)
    return () => {
      window.removeEventListener('dragenter', enter)
      window.removeEventListener('dragover', over)
      window.removeEventListener('dragleave', leave)
      window.removeEventListener('drop', drop)
    }
  }, [])

  function prefillUpload(g, s) {
    setUpGrade(g)
    setUpSubject(s)
    setFormOpen(true)
    setStatus('')
    uploadRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  function closeForm() {
    setFormOpen(false)
    setFiles([])
    setStatus('')
    setConfirmed(false)
  }

  async function handleUpload() {
    if (!upGrade) return setStatus('Pick a grade.')
    if (!upSubject) return setStatus('Pick a subject.')
    if (!title.trim()) return setStatus('Add a title.')
    const finalName = name.trim() || 'Anonymous'
    if (containsProfanity(finalName) || containsProfanity(title)) return setStatus('Keep it appropriate, please.')
    if (!confirmed) return setStatus('Confirm this follows the upload rules first.')
    if (files.length === 0) return setStatus('Add at least one PDF.')

    setBusy(true)
    setStatus('Uploading…')
    let uploaded = 0
    let skipped = 0
    let firstError = ''

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const hash = await sha256Hex(file)
      const { data: existing, error: lookupError } = await supabase.from('files').select('id').eq('file_hash', hash).maybeSingle()
      if (lookupError) { skipped++; firstError ||= `Lookup failed: ${lookupError.message}`; continue }
      if (existing) { skipped++; firstError ||= `"${file.name}" already exists.`; continue }

      const path = `past_paper/${crypto.randomUUID()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('papers').upload(path, file)
      if (uploadError) { skipped++; firstError ||= `Storage upload failed: ${uploadError.message}`; continue }

      const { data: urlData } = supabase.storage.from('papers').getPublicUrl(path)
      const { error: insertError } = await supabase.from('files').insert({
        type: 'past_paper',
        grade: upGrade,
        subject: upSubject,
        title: files.length > 1 ? `${title.trim()} (${i + 1})` : title.trim(),
        file_url: urlData.publicUrl,
        file_hash: hash,
        uploader_name: finalName,
        made_by_student: true,
      })
      if (insertError) { skipped++; firstError ||= `Database save failed: ${insertError.message}`; continue }
      uploaded++
    }

    setBusy(false)
    if (uploaded > 0) {
      setFiles([])
      setTitle('')
      setConfirmed(false)
      load()
    }
    const summary = `${uploaded} uploaded${skipped ? `, ${skipped} skipped` : ''}.`
    setStatus(firstError ? `${summary} ${firstError}` : summary)
  }

  // ---------- surprise ----------
  function roll() {
    if (papers.length === 0) return
    const pick = () => papers[Math.floor(Math.random() * papers.length)]
    if (flipped) {
      setFlipped(false)
      setTimeout(() => { setRolled(pick()); setFlipped(true) }, 320)
    } else {
      setRolled(pick())
      setFlipped(true)
    }
  }

  const goBrowse = (g, s) => {
    const q = new URLSearchParams()
    if (g) q.set('grade', g)
    if (s) q.set('subject', s)
    navigate(`/past-papers/browse?${q.toString()}`)
  }

  const dim = dragActive ? 'hub-dim' : ''
  const totalMyp = mypPapers.length
  const ladderFloor = Math.max(1, totalMyp * 0.1)

  return (
    <div className="bg-bentoCream min-h-screen">
      <style>{CSS}</style>
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className={`hub-tile mb-6 ${dim}`}>
          <p className="font-body text-xs text-bentoInkSoft hub-mono mb-1">MYP · Grades 6 to 10</p>
          <h1 className="font-display text-4xl text-bentoInk">Past papers</h1>
        </div>

        <div className="hub-grid">
          {/* GRADE LADDER */}
          <section className={`${tile} hub-ladder ${dim}`} aria-label="Papers by grade">
            <div className="flex gap-2" style={{ minHeight: 132 }}>
              {MYP_GRADES.map((g) => {
                const n = gradeCounts[g]
                const on = selGrade === g
                return (
                  <button
                    key={g}
                    onClick={() => setSelGrade(on ? '' : g)}
                    aria-pressed={on}
                    className={`hub-tile text-left rounded-2xl border p-3 flex flex-col justify-between min-w-[64px] ${
                      on ? 'bg-bentoInk border-bentoInk text-bentoCream' : 'bg-bentoCream border-bentoWood/25 text-bentoInk hover:border-bentoWood'
                    }`}
                    style={{ flex: `${Math.max(n, ladderFloor)} 1 0` }}
                  >
                    <span className="font-display text-5xl leading-none">{gradeNum(g)}</span>
                    <span className="hub-mono text-sm">{loading ? '–' : n}</span>
                  </button>
                )
              })}
            </div>
          </section>

          {/* UPLOAD CENTER */}
          <section
            ref={uploadRef}
            className={`${tile} hub-upload ${dragActive ? 'hub-upload-live' : ''}`}
            aria-label="Upload a past paper"
          >
            <div className="h-full rounded-2xl border-2 border-dashed border-bentoWood/40 p-5 flex flex-col" style={{ minHeight: 340 }}>
              {!formOpen ? (
                <button
                  onClick={() => inputRef.current?.click()}
                  className="flex-1 flex flex-col items-center justify-center text-center gap-4 text-bentoInk"
                >
                  <BentoTrayIcon className="w-28 text-bentoWood" />
                  <span className="font-display text-2xl">Add a paper</span>
                  <span className="font-body text-sm text-bentoInkSoft">
                    {dragActive ? 'Let go anywhere' : 'Drop a PDF anywhere on this page, or click to choose'}
                  </span>
                </button>
              ) : (
                <div className="flex-1 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <p className="font-display text-xl text-bentoInk">New paper</p>
                    <button onClick={closeForm} className="font-body text-xs text-bentoInkSoft underline">Cancel</button>
                  </div>

                  <button
                    onClick={() => inputRef.current?.click()}
                    className="text-left rounded-xl border border-dashed border-bentoWood/50 px-3 py-2 font-body text-sm text-bentoInk"
                  >
                    {files.length === 0
                      ? 'Choose PDF…'
                      : files.length === 1 ? files[0].name : `${files.length} PDFs selected`}
                  </button>

                  <div className="flex gap-2">
                    <select value={upGrade} onChange={(e) => setUpGrade(e.target.value)} className="flex-1 font-body text-sm rounded-xl border border-bentoWood/30 bg-bentoCream text-bentoInk px-2 py-2">
                      <option value="">Grade</option>
                      {MYP_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <select value={upSubject} onChange={(e) => setUpSubject(e.target.value)} className="flex-[2] min-w-0 font-body text-sm rounded-xl border border-bentoWood/30 bg-bentoCream text-bentoInk px-2 py-2">
                      <option value="">Subject</option>
                      {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className="font-body text-sm rounded-xl border border-bentoWood/30 bg-bentoCream text-bentoInk px-3 py-2" />
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name, or leave blank for anon" className="font-body text-sm rounded-xl border border-bentoWood/30 bg-bentoCream text-bentoInk px-3 py-2" />
                  <label className="flex items-start gap-2 font-body text-xs text-bentoInkSoft">
                    <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
                    This is not live assessment material or someone else's personal work.
                  </label>
                  <button
                    onClick={handleUpload}
                    disabled={busy}
                    className="mt-auto rounded-full bg-bentoStamp text-bentoCream font-body text-sm py-2 disabled:opacity-60"
                  >
                    {busy ? 'Uploading…' : 'Upload'}
                  </button>
                </div>
              )}
              <p className="font-body text-xs text-bentoInkSoft mt-3 min-h-[1rem]" aria-live="polite">{status}</p>
            </div>
            <input ref={inputRef} type="file" accept="application/pdf" multiple hidden onChange={(e) => { acceptFiles(e.target.files); e.target.value = '' }} />
          </section>

          {/* TRENDING THIS WEEK */}
          <section className={`${tile} hub-trending ${dim}`} aria-label="Trending this week">
            <p className="font-display text-lg text-bentoInk mb-3">Trending this week</p>
            <div className="space-y-2">
              {[0, 1, 2].map((i) => {
                const f = trending[i]
                return f ? (
                  <button
                    key={f.id}
                    onClick={() => goBrowse(f.grade, f.subject)}
                    className="relative w-full text-left overflow-hidden rounded-xl border border-bentoWood/20 bg-bentoCream px-3 py-2 min-h-[56px]"
                  >
                    <span className="absolute right-2 -top-2 font-display text-6xl leading-none text-bentoWood opacity-50" aria-hidden="true">{i + 1}</span>
                    <span className="relative block font-body text-sm text-bentoInk pr-10 truncate">{f.title}</span>
                    <span className="relative block hub-mono text-[11px] text-bentoInkSoft">{gradeNum(f.grade)} · {f.weekCount}</span>
                  </button>
                ) : (
                  <div key={i} className="relative rounded-xl border border-dashed border-bentoWood/30 min-h-[56px] overflow-hidden">
                    <span className="absolute right-2 -top-2 font-display text-6xl leading-none text-bentoWood opacity-50" aria-hidden="true">{i + 1}</span>
                  </div>
                )
              })}
            </div>
          </section>

          {/* SURPRISE ME */}
          <section className={`${tile} hub-surprise hub-flip p-0 ${dim}`} aria-label="Roll a paper" style={{ minHeight: 200 }}>
            <div className={`hub-flip-inner ${flipped ? 'flipped' : ''}`}>
              <div className="hub-face rounded-3xl p-5 flex flex-col items-center justify-center text-center gap-3">
                <button onClick={roll} disabled={papers.length === 0} className="flex flex-col items-center gap-3 text-bentoInk disabled:opacity-50">
                  <DieIcon className="w-12 text-bentoWood" />
                  <span className="font-display text-lg">Roll a paper</span>
                </button>
              </div>
              <div className="hub-face hub-back rounded-3xl p-4 flex flex-col justify-between bg-bentoCream border border-bentoWood/25">
                {rolled && (
                  <>
                    <div>
                      <p className="hub-mono text-[11px] text-bentoInkSoft">{gradeNum(rolled.grade)} · {rolled.subject}</p>
                      <p className="font-display text-base leading-snug text-bentoInk mt-1 line-clamp-3">{rolled.title}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => goBrowse(rolled.grade, rolled.subject)} className="flex-1 rounded-full bg-bentoStamp text-bentoCream font-body text-xs py-1.5">Open</button>
                      <button onClick={roll} className="flex-1 rounded-full border border-bentoWood/40 text-bentoInk font-body text-xs py-1.5">Again</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* QUIET STATS: no labels at rest */}
          <section className={`${tile} hub-stats hub-stat ${dim}`} aria-label={`${totalMyp} papers, ${totalDownloads} downloads, ${subjectsCovered} subjects covered`}>
            <div className="space-y-2">
              {[
                [totalMyp, 'papers'],
                [totalDownloads, 'downloads'],
                [subjectsCovered, 'subjects'],
              ].map(([n, label]) => (
                <div key={label} className="flex items-baseline justify-between gap-2">
                  <span className="hub-mono text-4xl text-bentoInk leading-tight">{loading ? '–' : n}</span>
                  <span className="hub-stat-label font-body text-xs text-bentoInkSoft" aria-hidden="true">{label}</span>
                </div>
              ))}
            </div>
          </section>

          {/* NEEDS A PAPER */}
          <section className={`${tile} hub-needs ${dim}`} aria-label="Papers we still need">
            <p className="font-display text-lg text-bentoInk mb-3">Needs a paper</p>
            <div className="flex flex-wrap gap-2">
              {gaps.length === 0 && !loading && <p className="font-body text-sm text-bentoInkSoft">Every box is full.</p>}
              {gaps.map(({ g, s }) => (
                <button
                  key={`${g}-${s}`}
                  onClick={() => prefillUpload(g, s)}
                  className="rounded-lg border-2 border-dashed border-bentoWood/45 px-2.5 py-1.5 text-left font-body text-xs text-bentoInk hover:border-bentoStamp transition-colors"
                >
                  <span className="block leading-tight">{s}</span>
                  <span className="block hub-mono text-[10px] text-bentoInkSoft">{g}</span>
                </button>
              ))}
            </div>
          </section>

          {/* SUBJECT CLOUD + ENTER */}
          <section className={`${tile} hub-cloud ${dim}`} aria-label="Papers by subject">
            <div className="flex flex-wrap items-center gap-2">
              {SUBJECTS.map((s) => {
                const n = subjectCounts[s]
                const step = subjectStep(n)
                const on = selSubject === s
                const size = step === 3 ? 'text-lg px-4 py-2' : step === 2 ? 'text-base px-3.5 py-1.5' : 'text-xs px-3 py-1'
                return (
                  <button
                    key={s}
                    onClick={() => setSelSubject(on ? '' : s)}
                    aria-pressed={on}
                    className={`hub-tile rounded-full border font-body ${size} ${
                      on ? 'bg-bentoInk border-bentoInk text-bentoCream' : 'bg-bentoCream border-bentoWood/30 text-bentoInk hover:border-bentoWood'
                    }`}
                  >
                    {s}
                  </button>
                )
              })}
            </div>

            <div
              className="overflow-hidden transition-all duration-300"
              style={{ maxHeight: selGrade && selSubject ? 64 : 0, opacity: selGrade && selSubject ? 1 : 0, marginTop: selGrade && selSubject ? 16 : 0 }}
            >
              <button
                onClick={() => goBrowse(selGrade, selSubject)}
                tabIndex={selGrade && selSubject ? 0 : -1}
                className="inline-flex items-center gap-3 rounded-full bg-bentoStamp text-bentoCream font-body text-sm pl-5 pr-4 py-2.5"
              >
                Open the box
                <LidIcon className="w-6" />
                <span className="hub-mono text-xs opacity-80">{gradeNum(selGrade || '')} · {selSubject}</span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
