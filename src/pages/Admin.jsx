import { useEffect, useMemo, useState } from 'react'
import { applySession } from '../supabaseClient'

async function callAdmin(password, action, payload) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, action, payload }),
  })
  let json
  try {
    json = await res.json()
  } catch {
    json = { ok: false, error: `Server returned ${res.status}` }
  }
  return json
}

async function callBeta(password, action, payload) {
  const res = await fetch('/api/beta-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload: { ...payload, password } }),
  })
  let json
  try {
    json = await res.json()
  } catch {
    json = { ok: false, error: `Server returned ${res.status}` }
  }
  return json
}

const TABS = ['Reports', 'All posts', 'All files', 'Requests', 'Feedback', 'Study links', 'Archive', 'Beta codes']

const isHttpUrl = (u) => /^https?:\/\//i.test(String(u || ''))
const KIND_LABEL = { discussion_post: 'Discussion post', file: 'File', resource_request: 'Request', feedback: 'Feedback', study_link: 'Study link' }

export default function Admin() {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('Reports')
  const [posts, setPosts] = useState([])
  const [files, setFiles] = useState([])
  const [requests, setRequests] = useState([])
  const [feedback, setFeedback] = useState([])
  const [reports, setReports] = useState([])
  const [studyLinks, setStudyLinks] = useState([])
  const [betaCodes, setBetaCodes] = useState([])
  const [archive, setArchive] = useState([])
  const [genCount, setGenCount] = useState(10)
  const [genLabels, setGenLabels] = useState('')
  const [loading, setLoading] = useState(false)
  const [tabError, setTabError] = useState('')

  async function loadPosts(onlyFlagged) {
    setLoading(true)
    setTabError('')
    const result = await callAdmin(password, 'list_posts', { onlyFlagged })
    if (result.ok) setPosts(result.data || [])
    else setTabError(result.error || 'Failed to load posts')
    setLoading(false)
  }

  async function loadFiles() {
    setLoading(true)
    setTabError('')
    const result = await callAdmin(password, 'list_files', {})
    if (result.ok) setFiles(result.data || [])
    else setTabError(result.error || 'Failed to load files')
    setLoading(false)
  }

  async function loadRequests() {
    setLoading(true)
    setTabError('')
    const result = await callAdmin(password, 'list_requests', {})
    if (result.ok) setRequests(result.data || [])
    else setTabError(result.error || 'Failed to load requests')
    setLoading(false)
  }

  async function loadFeedback() {
    setLoading(true)
    setTabError('')
    const result = await callAdmin(password, 'list_feedback', {})
    if (result.ok) setFeedback(result.data || [])
    else setTabError(result.error || 'Failed to load feedback')
    setLoading(false)
  }

  async function loadReports() {
    setLoading(true)
    setTabError('')
    const result = await callAdmin(password, 'list_reports', {})
    if (result.ok) setReports(result.data || [])
    else setTabError(result.error || 'Failed to load reports')
    setLoading(false)
  }

  async function loadStudyLinks() {
    setLoading(true)
    setTabError('')
    const result = await callAdmin(password, 'list_study_links', {})
    if (result.ok) setStudyLinks(result.data || [])
    else setTabError(result.error || 'Failed to load study links')
    setLoading(false)
  }

  async function loadArchive() {
    setLoading(true)
    setTabError('')
    const result = await callAdmin(password, 'list_archive', {})
    if (result.ok) setArchive(result.data || [])
    else setTabError(result.error || 'Failed to load the archive (has supabase/migration-9.sql been run?)')
    setLoading(false)
  }

  async function restoreEntry(entry) {
    const r = await callAdmin(password, 'restore_archive', { id: entry.id })
    if (!r.ok) return setTabError(r.error || 'Failed to restore')
    loadArchive()
  }

  async function loadBetaCodes() {
    setLoading(true)
    setTabError('')
    const result = await callBeta(password, 'list', {})
    if (result.ok) setBetaCodes(result.data || [])
    else setTabError(result.error || 'Failed to load codes')
    setLoading(false)
  }

  async function generateCodes() {
    const r = await callBeta(password, 'generate', { count: genCount, labels: genLabels })
    if (!r.ok) return setTabError(r.error || 'Failed to generate codes')
    setGenLabels('')
    loadBetaCodes()
  }

  async function resetCode(item) {
    const r = await callBeta(password, 'reset', { id: item.id })
    if (!r.ok) return setTabError(r.error || 'Failed to reset code')
    loadBetaCodes()
  }

  async function deleteCode(item) {
    const r = await callBeta(password, 'delete', { id: item.id })
    if (!r.ok) return setTabError(r.error || 'Failed to delete code')
    loadBetaCodes()
  }

  useEffect(() => {
    if (!unlocked) return
    if (tab === 'Reports') loadReports()
    if (tab === 'All posts') loadPosts(false)
    if (tab === 'All files') loadFiles()
    if (tab === 'Requests') loadRequests()
    if (tab === 'Feedback') loadFeedback()
    if (tab === 'Study links') loadStudyLinks()
    if (tab === 'Archive') loadArchive()
    if (tab === 'Beta codes') loadBetaCodes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked, tab])

  async function unlock() {
    setError('')
    const result = await callAdmin(password, 'ping', {})
    if (result.ok) {
      setUnlocked(true)
      // Give the admin a normal signed member session too, so the live site opens for them.
      // (This replaces the old localStorage flag, which anyone could set from their console.)
      callBeta(password, 'admin_session', {}).then((r) => { if (r.ok) applySession(r.token) }).catch(() => {})
    } else {
      setError(result.error || 'Wrong password.')
    }
  }

  async function unhide(post) {
    const r = await callAdmin(password, 'unhide_post', { id: post.id })
    if (!r.ok) return setTabError(r.error || 'Failed to unhide')
    loadPosts(false)
  }

  async function hide(post) {
    const r = await callAdmin(password, 'hide_post', { id: post.id })
    if (!r.ok) return setTabError(r.error || 'Failed to hide')
    loadPosts(false)
  }

  async function deletePost(post) {
    const r = await callAdmin(password, 'delete_post', { id: post.id })
    if (!r.ok) return setTabError(r.error || 'Failed to delete')
    loadPosts(false)
  }

  async function resolveReport(report) {
    const r = await callAdmin(password, 'resolve_report', { id: report.id })
    if (!r.ok) return setTabError(r.error || 'Failed to dismiss')
    loadReports()
  }

  async function hideFromReport(report) {
    const r = await callAdmin(password, 'hide_post', { id: report.target_id })
    if (!r.ok) return setTabError(r.error || 'Failed to hide')
    resolveReport(report)
  }

  async function deletePostFromReport(report) {
    const r = await callAdmin(password, 'delete_post', { id: report.target_id })
    if (!r.ok) return setTabError(r.error || 'Failed to delete')
    resolveReport(report)
  }

  async function deleteLinkFromReport(report) {
    const r = await callAdmin(password, 'delete_study_link', { id: report.target_id })
    if (!r.ok) return setTabError(r.error || 'Failed to delete')
    resolveReport(report)
  }

  async function deleteStudyLink(link) {
    const r = await callAdmin(password, 'delete_study_link', { id: link.id })
    if (!r.ok) return setTabError(r.error || 'Failed to delete')
    loadStudyLinks()
  }

  async function deleteFile(group) {
    const r = await callAdmin(password, 'delete_file', group.batch_id ? { batch_id: group.batch_id } : { id: group.files[0].id })
    if (!r.ok) return setTabError(r.error || 'Failed to delete')
    loadFiles()
  }

  const fileGroups = useMemo(() => {
    const map = new Map()
    files.forEach((f) => {
      const key = f.batch_id || f.id
      if (!map.has(key)) map.set(key, { key, batch_id: f.batch_id, title: f.title, type: f.type, grade: f.grade, subject: f.subject, uploader_name: f.uploader_name, files: [] })
      map.get(key).files.push(f)
    })
    return [...map.values()]
  }, [files])

  async function deleteRequest(request) {
    const r = await callAdmin(password, 'delete_request', { id: request.id })
    if (!r.ok) return setTabError(r.error || 'Failed to delete')
    loadRequests()
  }

  async function deleteFeedback(item) {
    const r = await callAdmin(password, 'delete_feedback', { id: item.id })
    if (!r.ok) return setTabError(r.error || 'Failed to delete')
    loadFeedback()
  }

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto px-4 py-24 relative">
        <h1 className="font-display text-3xl mb-4">Admin</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && unlock()}
          placeholder="Admin password"
          className="w-full font-body text-sm border border-ink/20 bg-parchment px-3 py-2 mb-3"
        />
        {error && <p className="font-body text-sm text-oxblood mb-2">{error}</p>}
        <button onClick={unlock} className="w-full bg-library text-parchment font-body text-sm py-2 shadow-card">
          Unlock
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 relative">
      <h1 className="font-display text-4xl mb-6">Admin</h1>

      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`stamp text-xs px-3 py-2 border ${tab === t ? 'bg-library text-parchment border-library' : 'border-ink/20 text-inkSoft'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading && <p className="font-body text-sm text-inkSoft mb-3">Loading…</p>}
      {tabError && <p className="font-body text-sm text-oxblood mb-3">{tabError}</p>}

      {tab === 'Reports' && (
        <div className="space-y-4">
          {!loading && reports.length === 0 && <p className="font-body text-inkSoft">No reports — nothing waiting on you.</p>}
          {reports.map((r) => (
            <div key={r.id} className={`tilt-card bg-parchmentDark border shadow-card p-5 ${r.resolved_at ? 'border-ink/10 opacity-60' : 'border-oxblood/40'}`}>
              <p className="stamp text-xs mb-1 text-inkSoft">
                {r.target_type === 'discussion_post' ? 'Discussion post' : 'Study link'} · {r.reason} · {new Date(r.created_at).toLocaleString()}
                {r.resolved_at ? ' · resolved' : ''}
              </p>
              <p className="font-body text-sm mb-1 whitespace-pre-wrap">{r.content_snapshot}</p>
              {r.detail && <p className="font-body text-xs text-inkSoft mb-3 italic">"{r.detail}"</p>}
              {!r.resolved_at && (
                <div className="flex flex-wrap gap-4 mt-2">
                  <button onClick={() => resolveReport(r)} className="font-body text-sm text-library underline">Dismiss (no action needed)</button>
                  {r.target_type === 'discussion_post' ? (
                    <>
                      <button onClick={() => hideFromReport(r)} className="font-body text-sm text-oxblood underline">Hide post</button>
                      <button onClick={() => deletePostFromReport(r)} className="font-body text-sm text-oxblood underline">Archive post</button>
                    </>
                  ) : (
                    <button onClick={() => deleteLinkFromReport(r)} className="font-body text-sm text-oxblood underline">Archive link</button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'All posts' && (
        <div className="space-y-4">
          {!loading && posts.length === 0 && <p className="font-body text-inkSoft">Nothing here.</p>}
          {posts.map((p) => (
            <div key={p.id} className="tilt-card bg-parchmentDark border border-ink/10 shadow-card p-5">
              <p className="stamp text-xs mb-1">
                {p.channel} · {p.hidden ? 'hidden' : 'visible'} · {p.author_name}
              </p>
              {p.topic && <p className="font-body text-sm font-medium mb-1">{p.topic}</p>}
              <p className="font-body text-sm mb-3 whitespace-pre-wrap">{p.body}</p>
              <div className="flex gap-4">
                {p.hidden ? (
                  <button onClick={() => unhide(p)} className="font-body text-sm text-library underline">Unhide</button>
                ) : (
                  <button onClick={() => hide(p)} className="font-body text-sm text-oxblood underline">Hide</button>
                )}
                <button onClick={() => deletePost(p)} className="font-body text-sm text-oxblood underline">Archive</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'All files' && (
        <div className="space-y-3">
          <p className="font-body text-xs text-inkSoft">Archiving removes it from the site but keeps a copy (and the PDF) in the Archive tab.</p>
          {!loading && fileGroups.length === 0 && <p className="font-body text-inkSoft">Nothing here.</p>}
          {fileGroups.map((g) => (
            <div key={g.key} className="tilt-card flex items-center justify-between bg-parchmentDark border border-ink/10 shadow-card p-4">
              <div>
                <p className="stamp text-xs mb-1">{g.type} · {g.grade} · {g.subject}</p>
                <p className="font-body text-sm">{g.title} — {g.uploader_name}</p>
                <p className="font-body text-xs text-inkSoft">{g.files.map((f) => f.file_role || 'paper').join(' + ')}</p>
              </div>
              <button onClick={() => deleteFile(g)} className="font-body text-sm text-oxblood underline shrink-0 ml-4">Archive{g.files.length > 1 ? ' all' : ''}</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Requests' && (
        <div className="space-y-3">
          {!loading && requests.length === 0 && <p className="font-body text-inkSoft">Nothing here.</p>}
          {requests.map((r) => (
            <div key={r.id} className="tilt-card flex items-center justify-between bg-parchmentDark border border-ink/10 shadow-card p-4">
              <div>
                <p className="stamp text-xs mb-1">{r.subject} · {r.status || 'open'} · ▲{r.upvotes || 0} ▼{r.downvotes || 0}</p>
                <p className="font-body text-sm">{r.description}</p>
              </div>
              <button onClick={() => deleteRequest(r)} className="font-body text-sm text-oxblood underline shrink-0 ml-4">Archive</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Feedback' && (
        <div className="space-y-3">
          {!loading && feedback.length === 0 && <p className="font-body text-inkSoft">Nothing here.</p>}
          {feedback.map((f) => (
            <div key={f.id} className="tilt-card flex items-start justify-between gap-4 bg-parchmentDark border border-ink/10 shadow-card p-4">
              <div>
                <p className="stamp text-xs text-inkSoft mb-1">{new Date(f.created_at).toLocaleDateString()}</p>
                <p className="font-body text-sm whitespace-pre-wrap">{f.message}</p>
              </div>
              <button onClick={() => deleteFeedback(f)} className="font-body text-sm text-oxblood underline shrink-0">Archive</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Study links' && (
        <div className="space-y-3">
          {!loading && studyLinks.length === 0 && <p className="font-body text-inkSoft">Nothing here.</p>}
          {studyLinks.map((l) => (
            <div key={l.id} className="tilt-card flex items-center justify-between bg-parchmentDark border border-ink/10 shadow-card p-4">
              <div>
                <p className="font-body text-sm">{l.name} — <span className="text-inkSoft break-all">{l.url}</span>{!isHttpUrl(l.url) && <span className="text-oxblood font-medium"> · UNSAFE LINK, archive it</span>}</p>
                <p className="stamp text-xs text-inkSoft">Added by {l.added_by}</p>
              </div>
              <button onClick={() => deleteStudyLink(l)} className="font-body text-sm text-oxblood underline shrink-0 ml-4">Archive</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Archive' && (
        <div className="space-y-3">
          <p className="font-body text-xs text-inkSoft">Everything removed from the site lands here, with its replies and comments. Restoring puts it back exactly as it was.</p>
          {!loading && archive.length === 0 && <p className="font-body text-inkSoft">Nothing archived yet.</p>}
          {archive.map((a) => (
            <div key={a.id} className={`tilt-card bg-parchmentDark border border-ink/10 shadow-card p-4 ${a.restored_at ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="stamp text-xs text-inkSoft mb-1">
                    {KIND_LABEL[a.kind] || a.kind} · archived {new Date(a.archived_at).toLocaleString()}
                    {a.restored_at ? ` · restored ${new Date(a.restored_at).toLocaleString()}` : ''}
                  </p>
                  <p className="font-body text-sm break-words">{a.summary}</p>
                </div>
                {!a.restored_at && (
                  <button onClick={() => restoreEntry(a)} className="font-body text-sm text-library underline shrink-0">Restore</button>
                )}
              </div>
              <details className="mt-2">
                <summary className="font-body text-xs text-inkSoft cursor-pointer">Show everything that was saved</summary>
                <pre className="font-body text-xs whitespace-pre-wrap break-words bg-parchment border border-ink/10 p-3 mt-2 max-h-72 overflow-auto">{JSON.stringify(a.data, null, 2)}</pre>
              </details>
            </div>
          ))}
        </div>
      )}

      {tab === 'Beta codes' && (
        <div>
          <div className="bg-parchmentDark border border-ink/20 shadow-card p-4 mb-6">
            <p className="font-body text-sm mb-3">
              Generate one-time invite codes. Each works on the first device
              that enters it, then stops working anywhere else — reset a
              code below if a tester needs to re-enter on a new device.
            </p>
            <div className="flex flex-wrap gap-3 mb-3">
              <div>
                <label className="font-body text-xs text-inkSoft block mb-1">How many</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={genCount}
                  onChange={(e) => setGenCount(e.target.value)}
                  className="w-24 font-body text-sm border border-ink/25 bg-parchment px-3 py-2"
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="font-body text-xs text-inkSoft block mb-1">Labels (optional, one per line — e.g. tester names)</label>
                <textarea
                  value={genLabels}
                  onChange={(e) => setGenLabels(e.target.value)}
                  placeholder={'Alice\nBen\nChen…'}
                  className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 h-16 resize-none"
                />
              </div>
            </div>
            <button onClick={generateCodes} className="bg-library text-parchment font-body text-sm px-4 py-2 shadow-card">
              Generate codes
            </button>
          </div>

          <div className="space-y-2">
            {!loading && betaCodes.length === 0 && <p className="font-body text-inkSoft">No codes yet — generate some above.</p>}
            {betaCodes.map((c) => (
              <div key={c.id} className="tilt-card flex items-center justify-between bg-parchmentDark border border-ink/10 shadow-card p-3">
                <div>
                  <p className="font-body text-sm font-medium tracking-wide">{c.code}{c.label ? ` — ${c.label}` : ''}</p>
                  <p className="stamp text-xs text-inkSoft">{c.used_at ? `Used ${new Date(c.used_at).toLocaleString()}` : 'Not used yet'}</p>
                </div>
                <div className="flex gap-4 shrink-0">
                  {c.used_at && <button onClick={() => resetCode(c)} className="font-body text-sm text-library underline">Reset</button>}
                  <button onClick={() => deleteCode(c)} className="font-body text-sm text-oxblood underline">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
