import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

async function callAdmin(password, action, payload) {
  const res = await fetch('/api/admin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password, action, payload }),
  })
  return res.json()
}

const TABS = ['Flagged', 'All posts', 'All files', 'Feedback']

export default function Admin() {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('Flagged')
  const [posts, setPosts] = useState([])
  const [files, setFiles] = useState([])
  const [feedback, setFeedback] = useState([])

  async function loadFeedback() {
    const { data } = await supabase
      .from('resource_requests')
      .select('*')
      .eq('subject', 'Feedback')
      .order('created_at', { ascending: false })
    setFeedback(data || [])
  }

  async function loadPosts(onlyFlagged) {
    let q = supabase.from('discussion_posts').select('*').order('created_at', { ascending: false })
    if (onlyFlagged) q = q.gt('flag_count', 0)
    const { data } = await q
    setPosts(data || [])
  }

  async function loadFiles() {
    const { data } = await supabase.from('files').select('*').order('created_at', { ascending: false })
    setFiles(data || [])
  }

  useEffect(() => {
    if (!unlocked) return
    if (tab === 'Flagged') loadPosts(true)
    if (tab === 'All posts') loadPosts(false)
    if (tab === 'All files') loadFiles()
    if (tab === 'Feedback') loadFeedback()
  }, [unlocked, tab])

  async function unlock() {
    const result = await callAdmin(password, 'ping', {})
    if (result.ok) {
      setUnlocked(true)
      setError('')
    } else {
      setError('Wrong password.')
    }
  }

  async function unhide(post) {
    await callAdmin(password, 'unhide_post', { id: post.id })
    loadPosts(tab === 'Flagged')
  }

  async function deletePost(post) {
    await callAdmin(password, 'delete_post', { id: post.id })
    loadPosts(tab === 'Flagged')
  }

  async function deleteFile(file) {
    await callAdmin(password, 'delete_file', { id: file.id })
    loadFiles()
  }

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto px-4 py-24 relative">
        <h1 className="font-display text-3xl mb-4">Admin</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
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

      <div className="flex gap-2 mb-6">
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

      {(tab === 'Flagged' || tab === 'All posts') && (
        <div className="space-y-4">
          {posts.length === 0 && <p className="font-body text-inkSoft">Nothing here.</p>}
          {posts.map((p) => (
            <div key={p.id} className="tilt-card bg-parchmentDark border border-ink/10 shadow-card p-5">
              <p className="stamp text-xs mb-1">
                {p.channel} · {p.flag_count || 0} flag(s) · {p.hidden ? 'hidden' : 'visible'} · {p.author_name}
              </p>
              <p className="font-body text-sm mb-3 whitespace-pre-wrap">{p.body}</p>
              <div className="flex gap-4">
                {p.hidden && <button onClick={() => unhide(p)} className="font-body text-sm text-library underline">Unhide / clear flags</button>}
                <button onClick={() => deletePost(p)} className="font-body text-sm text-oxblood underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'All files' && (
        <div className="space-y-3">
          {files.length === 0 && <p className="font-body text-inkSoft">Nothing here.</p>}
          {files.map((f) => (
            <div key={f.id} className="tilt-card flex items-center justify-between bg-parchmentDark border border-ink/10 shadow-card p-4">
              <div>
                <p className="stamp text-xs mb-1">{f.type} · {f.grade} · {f.subject}</p>
                <p className="font-body text-sm">{f.title} — {f.uploader_name}</p>
              </div>
              <button onClick={() => deleteFile(f)} className="font-body text-sm text-oxblood underline shrink-0 ml-4">Delete</button>
            </div>
          ))}
        </div>
      )}
      {tab === 'Feedback' && (
        <div className="space-y-3">
          {feedback.length === 0 && <p className="font-body text-inkSoft">Nothing here.</p>}
          {feedback.map((f) => (
            <div key={f.id} className="tilt-card bg-parchmentDark border border-ink/10 shadow-card p-4">
              <p className="stamp text-xs text-inkSoft mb-1">{new Date(f.created_at).toLocaleDateString()}</p>
              <p className="font-body text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
