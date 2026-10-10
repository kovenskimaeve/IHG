import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { SUBJECTS, sha256Hex, containsProfanity } from '../lib/device'
import { GRADE9_COURSES, subjectsForGrade } from '../lib/lessonFolders'
import { groupFiles, guessRole, ROLES } from '../lib/batches'

// MYP runs Grade 6-10; Grade 11 (DP) is intentionally not part of this hub.
const MYP_GRADES = ['Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10']
const gradeNum = (g) => g.replace('Grade ', '')

const INK = '#5B4638'
const INK_SOFT = '#9C8373'
const RICE = '#FFFDF8'
const RICE_EDGE = '#DCCAB0'
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
const SERIF = 'Fraunces, serif'

const CSS = `
.hub-stage{position:relative;height:calc(100dvh - 74px);min-height:600px;overflow:hidden}
.hub-grid{display:grid;gap:10px;height:100%;grid-template-columns:repeat(8,minmax(0,1fr));grid-template-rows:1.5fr 2fr 1.1fr;
  grid-template-areas:"ladder ladder ladder ladder ladder ladder ladder ladder" "egg egg egg egg trend trend trend trend" "needs needs needs roll stats stats pick pick"}
.a-ladder{grid-area:ladder}.a-egg{grid-area:egg}.a-trend{grid-area:trend}
.a-needs{grid-area:needs}.a-roll{grid-area:roll}.a-stats{grid-area:stats}.a-pick{grid-area:pick}
@media (max-width:899px){
  .hub-stage{height:auto;overflow:visible}
  .hub-grid{display:flex;flex-direction:column;height:auto}
  .hub-cell{min-height:150px}
}
.hub-cell{position:relative;overflow:hidden;min-width:0;min-height:0;border-radius:22px;background:#FFF8EC;padding:10px;
  transition:filter .25s ease,opacity .25s ease,transform .25s ease,background-color .25s ease}
.hub-dim{filter:blur(6px);opacity:.45;pointer-events:none}
.hub-egg-live{transform:scale(1.04);background:#FFE9A3 !important;z-index:5}
.hub-lid{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;z-index:10;
  transition:transform .8s cubic-bezier(.6,.05,.3,1),opacity .6s ease}
.hub-lid.up{transform:translateY(-115%) rotate(-5deg);opacity:0;pointer-events:none}
.hub-lid.drag{transform:scale(1.03)}
.hub-inside{position:absolute;inset:0;display:flex;flex-direction:column;gap:8px;transition:opacity .6s ease .15s,transform .6s ease .15s}
.hub-inside.shut{opacity:0;transform:scale(.95);pointer-events:none}
.hub-food{display:block;width:100%;height:100%;overflow:visible}
.hub-onigiri{transition:transform .2s ease;transform-origin:50% 100%}
.hub-onigiri:hover{transform:translateY(-4px) rotate(-2deg)}
.hub-bob{animation:hub-bob 2.4s ease-in-out infinite}
@keyframes hub-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
.hub-roll{transition:transform .6s ease}
.hub-roll:active{transform:rotate(360deg)}
.hub-stat-label{opacity:0;transition:opacity .25s ease}
.hub-stat:hover .hub-stat-label,.hub-stat:focus-within .hub-stat-label{opacity:1}
.hub-flip{perspective:900px}
.hub-flip-inner{position:relative;width:100%;height:100%;transform-style:preserve-3d;transition:transform .5s ease}
.hub-flip-inner.flipped{transform:rotateY(180deg)}
.hub-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.hub-back{transform:rotateY(180deg)}
@media (prefers-reduced-motion:reduce){.hub-cell,.hub-lid,.hub-inside,.hub-flip-inner,.hub-onigiri,.hub-roll,.hub-stat-label{transition:none}.hub-bob{animation:none}}
`

/* ------------------------------ drawings ------------------------------ */

function Sakura({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="0" cy="-12" rx="8" ry="13" transform={`rotate(${a})`} fill="#F8CDD2" stroke="#E7A0AC" strokeWidth="1.5" />
      ))}
      <circle r="4" fill="#E8B86A" />
    </g>
  )
}

function Seigaiha({ x, y }) {
  // concentric wave arcs, the classic Japanese scale pattern
  return (
    <g transform={`translate(${x} ${y})`} fill="none" stroke="#DE9A84" strokeWidth="3">
      {[34, 24, 14].map((r) => <circle key={r} r={r} />)}
      <g transform="translate(46 0)">{[34, 24, 14].map((r) => <circle key={r} r={r} />)}</g>
      <g transform="translate(-46 0)">{[34, 24, 14].map((r) => <circle key={r} r={r} />)}</g>
    </g>
  )
}

function LidCover() {
  const clip = useId()
  return (
    <svg viewBox="0 0 640 400" style={{ width: 'min(92vw, 620px)', maxHeight: 'calc(100dvh - 74px - 150px)' }} role="img" aria-label="A closed bento box lid labelled Past papers">
      <defs>
        <clipPath id={clip}><rect x="40" y="40" width="560" height="320" rx="34" /></clipPath>
      </defs>
      <rect x="20" y="20" width="600" height="360" rx="48" fill="#C46A52" stroke="#9E4F3B" strokeWidth="5" />
      <rect x="40" y="40" width="560" height="320" rx="34" fill="none" stroke="#E2A18B" strokeWidth="3" strokeDasharray="10 8" />
      <g clipPath={`url(#${clip})`}>
        <Seigaiha x="92" y="352" />
        <Seigaiha x="548" y="352" />
        <Seigaiha x="92" y="40" />
        <Seigaiha x="548" y="40" />
      </g>
      <Sakura x="118" y="112" s="1.1" />
      <Sakura x="520" y="104" s="0.85" />
      <Sakura x="560" y="218" s="0.6" />
      <Sakura x="82" y="236" s="0.6" />

      {/* sleepy face */}
      <path d="M232 150 q22 18 44 0" fill="none" stroke="#5B2E22" strokeWidth="5" strokeLinecap="round" />
      <path d="M364 150 q22 18 44 0" fill="none" stroke="#5B2E22" strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="216" cy="176" rx="24" ry="13" fill="#F0A9A0" />
      <ellipse cx="424" cy="176" rx="24" ry="13" fill="#F0A9A0" />
      <path d="M300 168 q20 20 40 0" fill="none" stroke="#5B2E22" strokeWidth="5" strokeLinecap="round" />

      {/* paper label */}
      <rect x="165" y="208" width="310" height="122" rx="18" fill="#FBF1E3" stroke="#E3CDB0" strokeWidth="3" />
      <text x="320" y="266" textAnchor="middle" fontFamily={SERIF} fontSize="46" fill={INK}>Past papers</text>
      <text x="320" y="302" textAnchor="middle" fontFamily={MONO} fontSize="15" fill={INK_SOFT}>MYP · Grades 6 to 10</text>
      <circle cx="446" cy="232" r="11" fill="none" stroke="#C9674F" strokeWidth="3" />

      {/* lift tab */}
      <rect x="270" y="346" width="100" height="26" rx="13" fill="#FBF1E3" stroke="#E3CDB0" strokeWidth="3" />
      <path d="M308 364 l12 -10 l12 10" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function LidIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 40 32" className={className} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 10 L34 4 L36 10 L8 16 Z" />
      <path d="M8 20h26v8a3 3 0 0 1-3 3H11a3 3 0 0 1-3-3z" />
    </svg>
  )
}

function ChopsticksIcon({ className = '' }) {
  return (
    <svg viewBox="0 0 36 36" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M5 31 L28 4" />
      <path d="M11 33 L33 9" />
    </svg>
  )
}

function Face({ x, y, s = 1 }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <circle cx="-12" cy="0" r="3.2" fill={INK} />
      <circle cx="12" cy="0" r="3.2" fill={INK} />
      <ellipse cx="-20" cy="8" rx="6" ry="3.6" fill="#F2B6B0" />
      <ellipse cx="20" cy="8" rx="6" ry="3.6" fill="#F2B6B0" />
      <path d="M-5 6 q5 6 10 0" fill="none" stroke={INK} strokeWidth="2.2" strokeLinecap="round" />
    </g>
  )
}

function Onigiri({ n, num, selected, loading }) {
  const fs = String(n).length > 2 ? 8 : 11
  return (
    <svg viewBox="0 0 140 108" className="hub-food" preserveAspectRatio="xMidYMax meet" aria-hidden="true">
      <g transform="translate(10 0) scale(1)">
      <path
        d="M60 6 C68 6 74 10 80 20 L108 78 C114 92 106 102 92 102 L28 102 C14 102 6 92 12 78 L40 20 C46 10 52 6 60 6 Z"
        fill={selected ? '#FFEFCF' : RICE}
        stroke={selected ? INK : RICE_EDGE}
        strokeWidth={selected ? 4.5 : 3.5}
      />
      <Face x={60} y={52} s={0.95} />
      <rect x="38" y="68" width="44" height="32" rx="5" fill="#3F4B43" />
      <text x="60" y="93" textAnchor="middle" fontFamily={SERIF} fontSize="26" fill="#F6EBDD">{num}</text>
      <circle cx="60" cy="27" r="10" fill="#D98A8A" stroke="#B96A6A" strokeWidth="1.5" />
      <text x="60" y="30.5" textAnchor="middle" fontFamily={MONO} fontSize={fs} fill="#FFF8EC">{loading ? '–' : n}</text>
      </g>
    </svg>
  )
}

function EggBackdrop() {
  // layered omelet, drawn edge to edge so the whole compartment is the food
  return (
    <svg className="absolute inset-0 w-full h-full" viewBox="0 0 300 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="300" height="200" fill="#F4D98A" />
      {[28, 68, 108, 148, 188].map((y, i) => (
        <path key={y} d={`M-10 ${y} q40 ${i % 2 ? -14 : 14} 80 0 t80 0 t80 0 t80 0`} fill="none" stroke="#E7BC5F" strokeWidth="5" strokeLinecap="round" opacity="0.85" />
      ))}
      {[[40, 52], [250, 90], [70, 170], [230, 176], [150, 14]].map(([cx, cy], i) => <circle key={i} cx={cx} cy={cy} r="3.5" fill="#D9A441" opacity="0.55" />)}
    </svg>
  )
}

function EggLabel({ live }) {
  return (
    <svg viewBox="0 0 300 170" className="hub-food" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <Face x={150} y={34} s={1.6} />
      <text x="150" y="108" textAnchor="middle" fontFamily={SERIF} fontSize="42" fill="#5E3F14">{live ? 'Let go!' : 'Add a paper'}</text>
      <text x="150" y="140" textAnchor="middle" fontFamily={MONO} fontSize="14" fill="#6E5018">drop a PDF anywhere</text>
    </svg>
  )
}

function Nigiri({ rank, title, meta, empty }) {
  return (
    <svg viewBox="0 0 520 64" className="hub-food" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <rect x="6" y="22" width="508" height="40" rx="20" fill={empty ? 'none' : RICE} stroke={RICE_EDGE} strokeWidth="2.5" strokeDasharray={empty ? '7 6' : '0'} />
      {!empty && <rect x="2" y="3" width="516" height="32" rx="16" fill="#F2A58E" stroke="#DB8A72" strokeWidth="2.5" />}
      {!empty && <path d="M120 10 q30 6 60 0 M260 12 q40 6 80 0 M400 10 q30 6 60 0" fill="none" stroke="#FBD9CE" strokeWidth="2.5" strokeLinecap="round" />}
      <text x="34" y="52" textAnchor="middle" fontFamily={SERIF} fontSize="24" fill={empty ? RICE_EDGE : INK}>{rank}</text>
      {!empty && <text x="22" y="25" fontFamily={SERIF} fontSize="16" fill="#5B2E22">{title}</text>}
      {!empty && <text x="70" y="50" fontFamily={MONO} fontSize="13" fill={INK_SOFT}>{meta}</text>}
    </svg>
  )
}

function Takoyaki({ line1, line2 }) {
  return (
    <svg viewBox="0 0 130 130" className="hub-food hub-roll" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <circle cx="65" cy="66" r="60" fill="#DDA66B" stroke="#B97B3F" strokeWidth="3" />
      <path d="M20 44 q45 -28 90 0 M14 62 q51 -24 102 0" fill="none" stroke="#7A4A2A" strokeWidth="6" strokeLinecap="round" opacity="0.7" />
      <path d="M26 38 q39 -18 78 0" fill="none" stroke="#FFF3D6" strokeWidth="2.5" strokeLinecap="round" />
      {[[34, 100], [96, 98], [52, 112], [80, 114]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill="#6F9A6A" />)}
      <Face x={65} y={52} s={0.8} />
      <text x="65" y="84" textAnchor="middle" fontFamily={SERIF} fontSize="21" fill="#4A2A14">{line1}</text>
      <text x="65" y="104" textAnchor="middle" fontFamily={SERIF} fontSize="16" fill="#4A2A14">{line2}</text>
    </svg>
  )
}

function Tomato({ value }) {
  const fs = String(value).length > 4 ? 11 : String(value).length > 2 ? 14 : 18
  return (
    <svg viewBox="0 0 70 70" className="hub-food" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <circle cx="35" cy="38" r="31" fill="#EE9F8D" stroke="#CC7461" strokeWidth="3" />
      <path d="M35 10 l5 8 l9 -3 l-4 9 l-10 -2 l-10 2 l-4 -9 l9 3 Z" fill="#8FB58A" stroke="#6F9A6A" strokeWidth="1.5" strokeLinejoin="round" />
      <circle cx="26" cy="32" r="2" fill={INK} /><circle cx="44" cy="32" r="2" fill={INK} />
      <ellipse cx="20" cy="38" rx="4" ry="2.4" fill="#F7C4BA" /><ellipse cx="50" cy="38" rx="4" ry="2.4" fill="#F7C4BA" />
      <text x="35" y="58" textAnchor="middle" fontFamily={MONO} fontSize={fs} fill="#5B2E22">{value}</text>
    </svg>
  )
}

/* ------------------------------ page ------------------------------ */

const field = 'font-body text-sm rounded-xl border border-bentoWood/30 bg-bentoCream text-bentoInk px-3 py-2'

function SubjectOptions({ grade }) {
  const list = grade ? subjectsForGrade(grade) : SUBJECTS
  const showCourses = !grade || grade === 'Grade 9'
  return (
    <>
      <optgroup label="Subjects">
        {list.map((s) => <option key={s} value={s}>{s}</option>)}
      </optgroup>
      {showCourses && (
        <optgroup label="Grade 9 courses">
          {GRADE9_COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
        </optgroup>
      )}
    </>
  )
}

export default function PastPapersHub() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [papers, setPapers] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const [selGrade, setSelGrade] = useState('')
  const [selSubject, setSelSubject] = useState('')

  const [dragActive, setDragActive] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [files, setFiles] = useState([])
  const [roles, setRoles] = useState([])
  const [upGrade, setUpGrade] = useState('')
  const [upSubject, setUpSubject] = useState('')
  const [title, setTitle] = useState('')
  const [name, setName] = useState('')
  const [confirmed, setConfirmed] = useState(false)
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const inputRef = useRef(null)

  const [rolled, setRolled] = useState(null)
  const [flipped, setFlipped] = useState(false)

  const load = useCallback(async () => {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [p, e] = await Promise.all([
      supabase.from('files').select('id, title, grade, subject, uploader_name, download_count, created_at, batch_id, file_role, type').eq('type', 'past_paper'),
      supabase.from('download_events').select('file_id').gte('created_at', weekAgo),
    ])
    setPapers(p.data || [])
    setEvents(e.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const mypPapers = useMemo(() => papers.filter((f) => MYP_GRADES.includes(f.grade)), [papers])

  const mypGroups = useMemo(() => groupFiles(mypPapers), [mypPapers])
  const allGroups = useMemo(() => groupFiles(papers), [papers])

  const gradeCounts = useMemo(() => {
    const c = Object.fromEntries(MYP_GRADES.map((g) => [g, 0]))
    mypGroups.forEach((g) => { c[g.grade]++ })
    return c
  }, [mypGroups])

  const trending = useMemo(() => {
    // downloads of a paper and of its answers add up to one trending entry
    const keyOf = Object.fromEntries(papers.map((f) => [f.id, f.batch_id || f.id]))
    const byKey = Object.fromEntries(allGroups.map((g) => [g.key, g]))
    const tally = {}
    events.forEach((ev) => { const k = keyOf[ev.file_id]; if (k) tally[k] = (tally[k] || 0) + 1 })
    return Object.entries(tally)
      .filter(([k]) => byKey[k])
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([k, n]) => ({ ...byKey[k], weekCount: n }))
  }, [events, papers, allGroups])

  const totalDownloads = useMemo(() => papers.reduce((s, f) => s + (f.download_count || 0), 0), [papers])
  const subjectsCovered = useMemo(() => new Set(mypPapers.map((f) => f.subject)).size, [mypPapers])

  // grade + subject pairs that exist for that grade but have no paper yet
  const gaps = useMemo(() => {
    const have = new Set(mypGroups.map((f) => `${f.grade}|${f.subject}`))
    const all = []
    MYP_GRADES.forEach((g) => subjectsForGrade(g).forEach((s) => { if (!have.has(`${g}|${s}`)) all.push({ g, s }) }))
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[all[i], all[j]] = [all[j], all[i]]
    }
    return all.slice(0, 4)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mypGroups.length])

  // keep the chosen subject valid when the grade changes
  useEffect(() => {
    if (!selSubject) return
    const valid = [...(selGrade ? subjectsForGrade(selGrade) : SUBJECTS), ...(!selGrade || selGrade === 'Grade 9' ? GRADE9_COURSES : [])]
    if (!valid.includes(selSubject)) setSelSubject('')
  }, [selGrade, selSubject])

  function acceptFiles(list) {
    const picked = Array.from(list || [])
    if (picked.length === 0) return
    setOpen(true)
    setFormOpen(true)
    if (picked.some((f) => f.type !== 'application/pdf')) return setStatus('Only PDF files are allowed.')
    if (picked.some((f) => f.size < 3000)) return setStatus('That file looks empty or almost empty. Check it has content before uploading.')
    setStatus('')
    setFiles(picked)
    setRoles(picked.map((f) => guessRole(f.name)))
  }

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
    setStatus('')
    setFormOpen(true)
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
    const batchId = crypto.randomUUID() // one upload = one resource, even with several files

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
        title: title.trim().slice(0, 200),
        file_url: urlData.publicUrl,
        file_hash: hash,
        uploader_name: finalName.slice(0, 60),
        made_by_student: true,
        batch_id: batchId,
        file_role: roles[i] || 'paper',
      })
      if (insertError) { skipped++; firstError ||= `Database save failed: ${insertError.message}`; continue }
      uploaded++
    }

    setBusy(false)
    if (uploaded > 0) {
      setFiles([])
      setRoles([])
      setTitle('')
      setConfirmed(false)
      load()
    }
    const summary = `${uploaded} uploaded${skipped ? `, ${skipped} skipped` : ''}.`
    setStatus(firstError ? `${summary} ${firstError}` : summary)
  }

  function roll() {
    if (allGroups.length === 0) return
    const pick = () => allGroups[Math.floor(Math.random() * allGroups.length)]
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
  const totalMyp = mypGroups.length
  const ladderFloor = Math.max(1, totalMyp * 0.7)
  const ready = selGrade && selSubject
  const short = (t, n) => (t.length > n ? `${t.slice(0, n - 1)}…` : t)

  return (
    <div className="bg-bentoCream">
      <style>{CSS}</style>
      <div className="hub-stage max-w-6xl mx-auto px-3 py-3">
        {/* ------------------------- closed: the cover ------------------------- */}
        <div className={`hub-lid ${open ? 'up' : ''} ${dragActive ? 'drag' : ''}`}>
          <button onClick={() => setOpen(true)} aria-label="Open the box" className="block">
            <LidCover />
          </button>
          <button
            onClick={() => setOpen(true)}
            className="hub-bob inline-flex items-center gap-3 rounded-full bg-bentoStamp text-bentoCream font-body text-lg px-8 py-3"
          >
            <LidIcon className="w-7" />
            Open the box
          </button>
          <p className="font-body text-sm text-bentoInkSoft">{dragActive ? 'Let go to add your paper' : 'or drop a PDF on the lid to share one'}</p>
        </div>

        {/* ------------------------- open: the compartments ------------------------- */}
        <div className={`hub-inside p-3 ${open ? '' : 'shut'}`}>
          <div className={`flex items-center justify-between px-1 ${dim}`} style={{ flex: '0 0 auto' }}>
            <div className="flex items-baseline gap-3">
              <h1 className="font-display text-2xl text-bentoInk">Past papers</h1>
              <span className="text-xs text-bentoInkSoft" style={{ fontFamily: MONO }}>MYP · Grades 6 to 10</span>
            </div>
            <button onClick={() => setOpen(false)} className="inline-flex items-center gap-2 font-body text-sm text-bentoInk rounded-full border border-bentoWood/40 px-3 py-1.5">
              <LidIcon className="w-5" />
              Close the lid
            </button>
          </div>

          <div className="flex-1 min-h-0 rounded-[28px] p-2.5" style={{ background: '#D9B38C', border: '3px solid #B88B63' }}>
            <div className="hub-grid">
              {/* bamboo mat of rice balls: grade ladder */}
              <section className={`hub-cell a-ladder flex flex-col ${dim}`} style={{ background: '#DCE5C0' }} aria-label="Papers by grade">
                <span className="self-start rounded-full px-3 py-0.5 text-xs font-body mb-1" style={{ background: '#3F4B43', color: '#F6EBDD' }}>Pick your grade</span>
                <div className="flex gap-2 flex-1 min-h-0 items-end">
                  {MYP_GRADES.map((g) => (
                    <button
                      key={g}
                      onClick={() => setSelGrade(selGrade === g ? '' : g)}
                      aria-pressed={selGrade === g}
                      aria-label={`${g}, ${gradeCounts[g]} papers`}
                      className="hub-onigiri h-full min-w-0"
                      style={{ flex: `${Math.max(gradeCounts[g], ladderFloor)} 1 0` }}
                    >
                      <Onigiri n={gradeCounts[g]} num={gradeNum(g)} selected={selGrade === g} loading={loading} />
                    </button>
                  ))}
                </div>
              </section>

              {/* tamagoyaki: upload (the whole compartment is the omelet) */}
              <section className={`hub-cell a-egg p-0 ${dragActive ? 'hub-egg-live' : ''}`} style={{ background: '#F4D98A' }} aria-label="Upload a past paper">
                <EggBackdrop />
                <button onClick={() => { setFormOpen(true); setStatus('') }} className="relative w-full h-full p-3 block" aria-label="Add a paper">
                  <EggLabel live={dragActive} />
                </button>
              </section>

              {/* sushi on shiso leaf: trending */}
              <section className={`hub-cell a-trend flex flex-col ${dim}`} style={{ background: '#CFE3B9' }} aria-label="Trending this week">
                <span className="self-start rounded-full px-3 py-0.5 text-xs font-body mb-1" style={{ background: '#3F4B43', color: '#F6EBDD' }}>Trending this week</span>
                <div className="flex flex-col flex-1 min-h-0 justify-around">
                  {[0, 1, 2].map((i) => {
                    const f = trending[i]
                    return f ? (
                      <button key={f.id} onClick={() => goBrowse(f.grade, f.subject)} className="min-h-0 text-left" aria-label={`${i + 1}. ${f.title}`}>
                        <Nigiri rank={i + 1} title={short(f.title, 42)} meta={`${gradeNum(f.grade)} · ${f.weekCount} this week`} />
                      </button>
                    ) : (
                      <div key={i} className="min-h-0"><Nigiri rank={i + 1} empty /></div>
                    )
                  })}
                </div>
              </section>

              {/* empty compartments: needs a paper */}
              <section className={`hub-cell a-needs flex flex-col ${dim}`} style={{ border: '2px dashed #A9805A', background: 'transparent' }} aria-label="Papers still missing">
                <p className="font-display text-base leading-none mb-2" style={{ color: INK }}>Still empty</p>
                <div className="flex flex-wrap gap-1.5 content-start overflow-hidden">
                  {gaps.length === 0 && !loading && <p className="font-body text-xs" style={{ color: INK }}>Every box is full.</p>}
                  {gaps.map(({ g, s }) => (
                    <button
                      key={`${g}-${s}`}
                      onClick={() => prefillUpload(g, s)}
                      className="rounded-lg border-2 border-dashed px-2 py-1 text-left hover:border-bentoStamp transition-colors"
                      style={{ borderColor: '#A9805A' }}
                    >
                      <span className="block font-body text-[11px] leading-tight" style={{ color: INK }}>{short(s, 24)}</span>
                      <span className="block text-[10px]" style={{ fontFamily: MONO, color: INK }}>{g}</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* takoyaki: roll a paper */}
              <section className={`hub-cell a-roll hub-flip p-0 ${dim}`} style={{ background: '#F0D2A0' }} aria-label="Roll a paper">
                <div className={`hub-flip-inner ${flipped ? 'flipped' : ''}`}>
                  <div className="hub-face p-1.5">
                    <button onClick={roll} disabled={allGroups.length === 0} className="w-full h-full disabled:opacity-50" aria-label="Roll a paper">
                      <Takoyaki line1="Roll" line2="a paper" />
                    </button>
                  </div>
                  <div className="hub-face hub-back rounded-[22px] p-2.5 flex flex-col justify-between" style={{ background: '#FBF1E3' }}>
                    {rolled && (
                      <>
                        <div className="min-h-0 overflow-hidden">
                          <p className="text-[10px] text-bentoInkSoft" style={{ fontFamily: MONO }}>{gradeNum(rolled.grade)} · {short(rolled.subject, 22)}</p>
                          <p className="font-display text-sm leading-snug text-bentoInk mt-0.5">{short(rolled.title, 40)}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <button onClick={() => goBrowse(rolled.grade, rolled.subject)} className="flex-1 rounded-full bg-bentoStamp text-bentoCream font-body text-[11px] py-1">Open</button>
                          <button onClick={roll} className="flex-1 rounded-full border border-bentoWood/40 text-bentoInk font-body text-[11px] py-1">Again</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* cherry tomatoes on lettuce: quiet stats, no labels at rest */}
              <section
                className={`hub-cell a-stats hub-stat flex flex-col justify-center ${dim}`}
                style={{ background: '#BBD6A5' }}
                aria-label={`${totalMyp} papers, ${totalDownloads} downloads, ${subjectsCovered} subjects covered`}
              >
                <div className="flex gap-1 items-center min-h-0" style={{ flex: '1 1 0' }}>
                  {[totalMyp, totalDownloads, subjectsCovered].map((v, i) => (
                    <div key={i} className="flex-1 min-w-0 h-full max-h-[84px]"><Tomato value={loading ? '–' : v} /></div>
                  ))}
                </div>
                <div className="hub-stat-label flex gap-1 text-[10px] text-center" aria-hidden="true" style={{ fontFamily: MONO, color: '#3F4B43' }}>
                  <span className="flex-1">papers</span><span className="flex-1">downloads</span><span className="flex-1">subjects</span>
                </div>
              </section>

              {/* pick a subject + go */}
              <section className={`hub-cell a-pick flex flex-col justify-between gap-2 ${dim}`} style={{ background: '#F7D5CF' }} aria-label="Choose what to open">
                <label className="block">
                  <span className="font-display text-base text-bentoInk leading-none block mb-1.5">
                    {selGrade ? `${selGrade}: pick a subject` : 'Pick a subject'}
                  </span>
                  <select value={selSubject} onChange={(e) => setSelSubject(e.target.value)} className={`${field} w-full`}>
                    <option value="">Choose…</option>
                    <SubjectOptions grade={selGrade} />
                  </select>
                </label>
                <button
                  onClick={() => ready && goBrowse(selGrade, selSubject)}
                  disabled={!ready}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-bentoStamp text-bentoCream font-body text-sm py-2 disabled:opacity-40"
                >
                  <ChopsticksIcon className="w-5" />
                  {ready ? 'Show papers' : selGrade ? 'Choose a subject' : 'Choose a grade first'}
                </button>
              </section>
            </div>
          </div>
        </div>

        {/* upload sheet */}
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(91,70,56,0.45)' }} onClick={closeForm}>
            <div className="w-full max-w-md rounded-3xl p-4 bg-bentoCream" onClick={(e) => e.stopPropagation()}>
              <div className="rounded-2xl border-2 border-dashed border-bentoWood/50 p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="font-display text-xl text-bentoInk">Add a paper</p>
                  <button onClick={closeForm} className="font-body text-xs text-bentoInkSoft underline">Cancel</button>
                </div>
                <button onClick={() => inputRef.current?.click()} className="text-left rounded-xl border border-dashed border-bentoWood/50 px-3 py-2 font-body text-sm text-bentoInk">
                  {files.length === 0 ? 'Choose PDF…' : files.length === 1 ? files[0].name : `${files.length} PDFs selected`}
                </button>
                {files.length > 0 && (
                  <div className="space-y-1.5">
                    {files.length > 1 && <p className="font-body text-xs text-bentoInkSoft">These go up as one resource. Mark which is which:</p>}
                    {files.map((f, i) => (
                      <div key={f.name + i} className="flex items-center gap-2">
                        <span className="font-body text-xs text-bentoInk flex-1 min-w-0 truncate">{f.name}</span>
                        <select
                          value={roles[i] || 'paper'}
                          onChange={(e) => setRoles((r) => r.map((v, k) => (k === i ? e.target.value : v)))}
                          className="font-body text-xs rounded-lg border border-bentoWood/30 bg-bentoCream text-bentoInk px-2 py-1"
                        >
                          {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                        </select>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <select value={upGrade} onChange={(e) => setUpGrade(e.target.value)} className={`${field} flex-1`}>
                    <option value="">Grade</option>
                    {MYP_GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                  <select value={upSubject} onChange={(e) => setUpSubject(e.target.value)} className={`${field} flex-[2] min-w-0`}>
                    <option value="">Subject</option>
                    <SubjectOptions grade={upGrade} />
                  </select>
                </div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" className={field} />
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name, or leave blank for anon" className={field} />
                <label className="flex items-start gap-2 font-body text-xs text-bentoInkSoft">
                  <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
                  This is not live assessment material or someone else's personal work.
                </label>
                <button onClick={handleUpload} disabled={busy} className="rounded-full bg-bentoStamp text-bentoCream font-body text-sm py-2 disabled:opacity-60">
                  {busy ? 'Uploading…' : 'Upload'}
                </button>
                <p className="font-body text-xs text-bentoInkSoft min-h-[1rem]" aria-live="polite">{status}</p>
              </div>
            </div>
          </div>
        )}
        <input ref={inputRef} type="file" accept="application/pdf" multiple hidden onChange={(e) => { acceptFiles(e.target.files); e.target.value = '' }} />
      </div>
    </div>
  )
}
