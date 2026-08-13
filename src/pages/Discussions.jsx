import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { SUBJECTS, containsProfanity, getDeviceId } from '../lib/device'

const CHANNELS = ['General', ...SUBJECTS.map((s) => `Q&A: ${s}`)]

export default function Discussions() {
  const [channel, setChannel] = useState('General')
  const [posts, setPosts] = useState([])
  const [authorName, setAuthorName] = useState('')
  const [body, setBody] = useState('')
  const [replyOpenFor, setReplyOpenFor] = useState(null)
  const [replyText, setReplyText] = useState('')
  const [error, setError] = useState('')

  async function load() {
    const { data } = await supabase
      .from('discussion_posts')
      .select('*')
      .eq('channel', channel)
      .eq('hidden', false)
      .order('created_at', { ascending: true })
    setPosts(data || [])
  }

  useEffect(() => {
    load()
    const sub = supabase
      .channel(`discussions-${channel}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_posts', filter: `channel=eq.${channel}` }, load)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [channel])

  async function submitPost(parentId, text) {
    if (!authorName.trim()) return setError('Add a display name first.')
    if (containsProfanity(authorName) || containsProfanity(text)) return setError('Keep it appropriate, please.')
    if (!text.trim()) return
    setError('')
    await supabase.from('discussion_posts').insert({
      channel,
      parent_id: parentId,
      author_name: authorName.trim(),
      body: text.trim(),
    })
    if (parentId) {
      setReplyText('')
      setReplyOpenFor(null)
    } else {
      setBody('')
    }
    load()
  }

  async function vote(post, delta) {
    const deviceId = getDeviceId()
    const { error: voteErr } = await supabase.from('post_votes').insert({
      post_id: post.id,
      device_id: deviceId,
      vote: delta,
    })
    if (voteErr) return // already voted on this post
    const field = delta > 0 ? 'upvotes' : 'downvotes'
    await supabase.from('discussion_posts').update({ [field]: (post[field] || 0) + 1 }).eq('id', post.id)
    load()
  }

  async function report(post) {
    const newCount = (post.flag_count || 0) + 1
    await supabase
      .from('discussion_posts')
      .update({ flag_count: newCount, hidden: newCount >= 3 })
      .eq('id', post.id)
    load()
  }

  const topLevel = posts.filter((p) => !p.parent_id)
  const repliesFor = (id) => posts.filter((p) => p.parent_id === id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl mb-6">Discussions</h1>

      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        {CHANNELS.map((c) => (
          <button
            key={c}
            onClick={() => setChannel(c)}
            className={`stamp text-xs whitespace-nowrap px-3 py-2 border ${
              channel === c ? 'bg-library text-parchment border-library' : 'border-ink/25 text-inkSoft'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="bg-parchmentDark border border-ink/20 shadow-card p-5 mb-8">
        <input
          value={authorName}
          onChange={(e) => setAuthorName(e.target.value)}
          placeholder="Your display name"
          className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 mb-3"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={channel === 'General' ? 'Say anything (keep it appropriate)...' : 'Ask a question or answer one — give working, not just a final answer...'}
          className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 h-24 resize-none mb-3"
        />
        {error && <p className="font-body text-sm text-oxblood mb-2">{error}</p>}
        <button onClick={() => submitPost(null, body)} className="bg-library text-parchment font-body text-sm px-5 py-2 shadow-card hover:shadow-cardHover">
          Post
        </button>
      </div>

      <div className="space-y-5">
        {topLevel.length === 0 && <p className="font-body text-inkSoft">No posts yet in this channel — start one.</p>}
        {topLevel.map((post) => (
          <div key={post.id} className="tilt-card bg-parchment border border-ink/20 shadow-card p-5">
            <div className="flex justify-between items-start mb-2">
              <p className="stamp text-[10px] text-inkSoft">{post.author_name}</p>
              <button onClick={() => report(post)} className="font-body text-xs text-inkSoft underline">Report</button>
            </div>
            <p className="font-body text-sm leading-relaxed mb-3 whitespace-pre-wrap">{post.body}</p>
            <div className="flex items-center gap-4 torn-edge pb-3 mb-3">
              <button onClick={() => vote(post, 1)} className="font-body text-sm">▲ {post.upvotes || 0}</button>
              <button onClick={() => vote(post, -1)} className="font-body text-sm">▼ {post.downvotes || 0}</button>
              <button onClick={() => setReplyOpenFor(replyOpenFor === post.id ? null : post.id)} className="font-body text-sm text-library underline">
                Reply
              </button>
            </div>

            {repliesFor(post.id).map((r) => (
              <div key={r.id} className="ml-4 pl-4 border-l-2 border-ink/15 mb-3">
                <p className="stamp text-[10px] text-inkSoft mb-1">{r.author_name}</p>
                <p className="font-body text-sm leading-relaxed mb-2 whitespace-pre-wrap">{r.body}</p>
                <div className="flex items-center gap-4">
                  <button onClick={() => vote(r, 1)} className="font-body text-xs">▲ {r.upvotes || 0}</button>
                  <button onClick={() => vote(r, -1)} className="font-body text-xs">▼ {r.downvotes || 0}</button>
                  <button onClick={() => report(r)} className="font-body text-xs text-inkSoft underline">Report</button>
                </div>
              </div>
            ))}

            {replyOpenFor === post.id && (
              <div className="ml-4">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Your reply, with working shown..."
                  className="w-full font-body text-sm border border-ink/25 bg-parchmentDark px-3 py-2 h-16 resize-none mb-2"
                />
                <button onClick={() => submitPost(post.id, replyText)} className="bg-library text-parchment font-body text-xs px-4 py-2 shadow-card">
                  Reply
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
