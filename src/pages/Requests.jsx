import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { SUBJECTS, containsProfanity, getDeviceId } from '../lib/device'
import { GRADE9_COURSES } from '../lib/lessonFolders'

const REQUEST_TOPICS = [...SUBJECTS, ...GRADE9_COURSES, 'External resource (link, site, tool)']

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [comments, setComments] = useState([])
  const [subject, setSubject] = useState(REQUEST_TOPICS[0])
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [openFor, setOpenFor] = useState(null)
  const [commentName, setCommentName] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commentError, setCommentError] = useState('')

  async function load() {
    const { data } = await supabase
      .from('resource_requests')
      .select('*')
      .neq('subject', 'Feedback')
    const sorted = (data || []).sort((a, b) => ((b.upvotes || 0) - (b.downvotes || 0)) - ((a.upvotes || 0) - (a.downvotes || 0)))
    setRequests(sorted)
  }

  async function loadComments() {
    const { data } = await supabase
      .from('request_comments')
      .select('*')
      .order('created_at', { ascending: true })
    setComments(data || [])
  }

  useEffect(() => {
    load()
    loadComments()
    const sub = supabase
      .channel('requests-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'resource_requests' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'request_comments' }, loadComments)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [])

  async function submit() {
    if (!description.trim()) return
    setError('')
    const { error: insertError } = await supabase.from('resource_requests').insert({ subject, description: description.trim() })
    if (insertError) {
      setError(`Couldn't post: ${insertError.message}`)
      return
    }
    setDescription('')
    load()
  }

  async function vote(r, field) {
    const delta = field === 'upvotes' ? 1 : -1
    const { error: voteErr } = await supabase.rpc('vote_request', { p_request: r.id, p_device: getDeviceId(), p_vote: delta })
    if (voteErr) {
      if (voteErr.code === 'PGRST202') {
        // migration-9 not run yet: use the old route so voting keeps working
        await supabase.from('resource_requests').update({ [field]: (r[field] || 0) + 1 }).eq('id', r.id)
        load()
      }
      return // already voted from this device
    }
    load()
  }

  async function submitComment(requestId) {
    if (!commentName.trim()) return setCommentError('Add a display name first (or type Anonymous).')
    if (containsProfanity(commentName) || containsProfanity(commentText)) return setCommentError('Keep it appropriate, please.')
    if (!commentText.trim()) return
    setCommentError('')
    const { error: insertError } = await supabase.from('request_comments').insert({
      request_id: requestId,
      author_name: commentName.trim(),
      body: commentText.trim(),
    })
    if (insertError) {
      setCommentError(`Couldn't post: ${insertError.message}`)
      return
    }
    setCommentText('')
    loadComments()
  }

  const commentsFor = (id) => comments.filter((c) => c.request_id === id)

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl mb-6">Resource requests</h1>

      <div className="bg-parchmentDark border border-ink/20 shadow-card p-5 mb-8">
        <select value={subject} onChange={(e) => setSubject(e.target.value)} className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 mb-3">
          {REQUEST_TOPICS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="What are you missing? e.g. 'Grade 10 Science, unit 3 formative'"
          className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 h-20 resize-none mb-3"
        />
        {error && <p className="font-body text-sm text-oxblood mb-2">{error}</p>}
        <button onClick={submit} className="bg-library text-parchment font-body text-sm px-5 py-2 shadow-card hover:shadow-cardHover">
          Request it
        </button>
      </div>

      <div className="space-y-4">
        {requests.length === 0 && <p className="font-body text-inkSoft">No requests yet — start one.</p>}
        {requests.map((r) => (
          <div key={r.id} className="tilt-card bg-parchment border border-ink/20 shadow-card p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="stamp text-[10px] text-oxblood mb-1">{r.subject}</p>
                <p className="font-body text-sm">{r.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0 ml-4">
                <button onClick={() => vote(r, 'upvotes')} className="font-body text-sm">▲ {r.upvotes || 0}</button>
                <button onClick={() => vote(r, 'downvotes')} className="font-body text-sm">▼ {r.downvotes || 0}</button>
              </div>
            </div>

            <div className="torn-edge pt-3 mt-3">
              <button
                onClick={() => setOpenFor(openFor === r.id ? null : r.id)}
                className="font-body text-xs text-library underline"
              >
                {commentsFor(r.id).length > 0
                  ? `${commentsFor(r.id).length} comment${commentsFor(r.id).length === 1 ? '' : 's'}`
                  : 'Comment'}
              </button>

              {openFor === r.id && (
                <div className="mt-3 space-y-3">
                  {commentsFor(r.id).map((c) => (
                    <div key={c.id} className="ml-1 pl-3 border-l-2 border-ink/15">
                      <p className="stamp text-[10px] text-inkSoft mb-0.5">{c.author_name} · {formatDate(c.created_at)}</p>
                      <p className="font-body text-sm leading-relaxed whitespace-pre-wrap">{c.body}</p>
                    </div>
                  ))}
                  <input
                    value={commentName}
                    onChange={(e) => setCommentName(e.target.value)}
                    placeholder="Your display name, or 'Anonymous'"
                    className="w-full font-body text-sm border border-ink/25 bg-parchmentDark px-3 py-2"
                  />
                  <textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Know where to find this, or have it yourself? Say so..."
                    className="w-full font-body text-sm border border-ink/25 bg-parchmentDark px-3 py-2 h-16 resize-none"
                  />
                  {commentError && <p className="font-body text-xs text-oxblood">{commentError}</p>}
                  <button onClick={() => submitComment(r.id)} className="bg-library text-parchment font-body text-xs px-4 py-2 shadow-card">
                    Reply
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
