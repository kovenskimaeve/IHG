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

export default function Admin() {
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)
  const [error, setError] = useState('')
  const [flagged, setFlagged] = useState([])

  async function loadFlagged() {
    const { data } = await supabase
      .from('discussion_posts')
      .select('*')
      .gt('flag_count', 0)
      .order('flag_count', { ascending: false })
    setFlagged(data || [])
  }

  async function unlock() {
    const result = await callAdmin(password, 'ping', {})
    if (result.ok) {
      setUnlocked(true)
      setError('')
      loadFlagged()
    } else {
      setError('Wrong password.')
    }
  }

  async function unhide(post) {
    await callAdmin(password, 'unhide_post', { id: post.id })
    loadFlagged()
  }

  async function deletePost(post) {
    await callAdmin(password, 'delete_post', { id: post.id })
    loadFlagged()
  }

  if (!unlocked) {
    return (
      <div className="max-w-sm mx-auto px-4 py-24">
        <h1 className="font-display text-3xl mb-4">Admin</h1>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Admin password"
          className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 mb-3"
        />
        {error && <p className="font-body text-sm text-oxblood mb-2">{error}</p>}
        <button onClick={unlock} className="w-full bg-library text-parchment font-body text-sm py-2 shadow-card">
          Unlock
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl mb-6">Admin — flagged posts</h1>
      {flagged.length === 0 && <p className="font-body text-inkSoft">Nothing flagged right now.</p>}
      <div className="space-y-4">
        {flagged.map((p) => (
          <div key={p.id} className="bg-parchmentDark border border-ink/20 shadow-card p-5">
            <p className="stamp text-xs text-oxblood mb-1">
              {p.flag_count} flag(s) · {p.hidden ? 'hidden' : 'visible'} · {p.author_name}
            </p>
            <p className="font-body text-sm mb-3 whitespace-pre-wrap">{p.body}</p>
            <div className="flex gap-4">
              <button onClick={() => unhide(p)} className="font-body text-sm text-library underline">Unhide / clear flags</button>
              <button onClick={() => deletePost(p)} className="font-body text-sm text-oxblood underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
