import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { containsProfanity, getDeviceId } from '../lib/device'
import ReportModal from '../components/ReportModal'

const CURATED = [
  { name: 'Khan Academy', url: 'https://www.khanacademy.org', subject: 'All subjects' },
  { name: 'Dr Frost Maths (DFM)', url: 'https://www.drfrostmaths.com', subject: 'Mathematics' },
  { name: 'Mathspace', url: 'https://mathspace.co', subject: 'Mathematics' },
  { name: 'Quizlet', url: 'https://quizlet.com', subject: 'All subjects' },
  { name: 'BBC Bitesize', url: 'https://www.bbc.co.uk/bitesize', subject: 'All subjects' },
]

const BLOCKED_DOMAINS = [
  'youtube.com', 'youtu.be', 'instagram.com', 'tiktok.com', 'facebook.com',
  'twitter.com', 'x.com', 'snapchat.com', 'reddit.com', 'discord.com', 'discord.gg',
]

function getDomain(url) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return null }
}

export default function StudyLinks() {
  const [submitted, setSubmitted] = useState([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [addedBy, setAddedBy] = useState('')
  const [status, setStatus] = useState('')
  const [reportTarget, setReportTarget] = useState(null)

  async function submitReport(reason, detail) {
    const { error: reportError } = await supabase.from('reports').insert({
      target_type: 'study_link',
      target_id: reportTarget.id,
      reason,
      detail: detail || null,
      content_snapshot: `${reportTarget.name} — ${reportTarget.url}`,
      device_id: getDeviceId(),
    })
    if (reportError) throw new Error(reportError.message)
  }

  async function load() {
    const { data } = await supabase.from('study_links').select('*').order('created_at', { ascending: false })
    setSubmitted(data || [])
  }
  useEffect(() => {
    load()
    const sub = supabase
      .channel('study-links-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'study_links' }, load)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function handleSubmit() {
    const domain = getDomain(url)
    if (!name.trim() || !domain) return setStatus('Add a name and a valid link.')
    if (containsProfanity(name)) return setStatus('That name isn\u2019t appropriate — pick another.')
    if (BLOCKED_DOMAINS.some((b) => domain === b || domain.endsWith(`.${b}`))) {
      return setStatus('Social media and video platforms aren\u2019t allowed here — study sites only.')
    }
    const allExisting = [...CURATED.map((c) => c.url), ...submitted.map((s) => s.url)]
    if (allExisting.some((u) => getDomain(u) === domain && u.replace(/\/$/, '') === url.replace(/\/$/, ''))) {
      return setStatus('That link is already here.')
    }
    const { error } = await supabase.from('study_links').insert({
      name: name.trim(), url, added_by: addedBy.trim() || 'Anonymous',
    })
    if (error) return setStatus(`Couldn\u2019t add it: ${error.message}`)
    setName(''); setUrl(''); setStatus('Added — thanks!')
    load()
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl mb-2">Study links</h1>
      <p className="font-body text-sm text-inkSoft mb-8">
        Safe, external study sites — nothing hosted here, just pointers. No social media or video platforms.
      </p>

      <div className="divide-y divide-ink/15 border-t border-b border-ink/15 mb-8">
        {[
          ...CURATED.map((c) => ({ ...c, reportable: false })),
          ...submitted.map((s) => ({ id: s.id, name: s.name, url: s.url, subject: `Added by ${s.added_by}`, reportable: true })),
        ].map((l) => (
          <div key={l.id || l.url} className="flex items-center justify-between py-4 hover:bg-parchmentDark px-2 transition-colors">
            <a href={l.url} target="_blank" rel="noreferrer" className="flex-1 min-w-0">
              <span className="font-display text-lg">{l.name}</span>
            </a>
            <div className="flex items-center gap-3 shrink-0">
              <span className="stamp text-xs text-inkSoft">{l.subject}</span>
              {l.reportable && (
                <button onClick={() => setReportTarget(l)} className="font-body text-xs text-inkSoft underline">Report</button>
              )}
            </div>
          </div>
        ))}
      </div>

      {reportTarget && <ReportModal onSubmit={submitReport} onClose={() => setReportTarget(null)} />}

      <div className="bg-parchmentDark border border-ink/20 shadow-card p-5">
        <p className="stamp text-xs mb-3">Add a study link</p>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Site name"
          className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 mb-2"
        />
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 mb-2"
        />
        <input
          value={addedBy}
          onChange={(e) => setAddedBy(e.target.value)}
          placeholder="Your name, or leave blank for Anonymous"
          className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 mb-3"
        />
        {status && <p className="font-body text-sm text-oxblood mb-2">{status}</p>}
        <button onClick={handleSubmit} className="bg-library text-parchment font-body text-sm px-5 py-2 shadow-card hover:shadow-cardHover">
          Add link
        </button>
      </div>
    </div>
  )
}
