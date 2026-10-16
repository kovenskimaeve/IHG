import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { SUBJECTS, GRADES, containsProfanity, getDeviceId } from '../lib/device'
import { GRADE9_COURSES } from '../lib/lessonFolders'
import ReportModal from '../components/ReportModal'

const CATEGORIES = ['Q&A', 'Tips & Discussion']
const SUBJECT_CHOICES = ['General', ...SUBJECTS, 'Others']
const MAX_VISUAL_INDENT = 6 // after this many nested levels, stop indenting further (still fully functional, just stops drifting right)

function formatDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function ReplyBox({ onSubmit }) {
  // Own local state: typing here never re-renders (or re-mounts) the rest of the page.
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function send() {
    if (busy) return
    setBusy(true)
    const err = await onSubmit(text)
    setBusy(false)
    if (err) setError(err)
    else setText('')
  }

  return (
    <div className="mb-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Your reply, with working shown..."
        className="w-full font-body text-sm border border-ink/25 bg-parchmentDark px-3 py-2 h-16 resize-none mb-2"
      />
      {error && <p className="font-body text-xs text-oxblood mb-2">{error}</p>}
      <button onClick={send} disabled={busy} className="bg-library text-parchment font-body text-xs px-4 py-2 shadow-card disabled:opacity-60">
        Reply
      </button>
    </div>
  )
}

// Declared at module level (NOT inside Discussions). When it lived inside, every keystroke made
// React see a brand-new component type, unmount the whole thread and drop focus from the textarea.
function PostNode({ post, depth, ctx }) {
  const indent = Math.min(depth, MAX_VISUAL_INDENT)
  const replies = ctx.childrenOf(post.id)
  return (
    <div className={indent > 0 ? 'ml-4 pl-4 border-l-2 border-ink/15 mt-3' : ''}>
      <p className="stamp text-[10px] text-inkSoft mb-1">
        {post.author_name}{post.grade ? ` · ${post.grade}` : ''} · {formatDate(post.created_at)}
      </p>
      {post.topic && <p className="font-display text-base mb-1">{post.topic}</p>}
      <p className="font-body text-sm leading-relaxed mb-2 whitespace-pre-wrap">{post.body}</p>
      <div className="flex items-center gap-4 mb-2">
        <button onClick={() => ctx.onVote(post, 1)} className="font-body text-xs">▲ {post.upvotes || 0}</button>
        <button onClick={() => ctx.onVote(post, -1)} className="font-body text-xs">▼ {post.downvotes || 0}</button>
        <button onClick={() => ctx.setReplyOpenFor(ctx.replyOpenFor === post.id ? null : post.id)} className="font-body text-xs text-library underline">
          Reply
        </button>
        <button onClick={() => ctx.onReport(post)} className="font-body text-xs text-inkSoft underline">Report</button>
      </div>

      {ctx.replyOpenFor === post.id && <ReplyBox onSubmit={(text) => ctx.onReply(post.id, text)} />}

      {replies.map((r) => <PostNode key={r.id} post={r} depth={depth + 1} ctx={ctx} />)}
    </div>
  )
}

export default function Discussions() {
  const [category, setCategory] = useState('Q&A')
  const [subjectChoice, setSubjectChoice] = useState('General')
  const [course, setCourse] = useState(GRADE9_COURSES[0])
  const [gradeFilter, setGradeFilter] = useState('') // '' = all grades
  const [posts, setPosts] = useState([])
  const [authorName, setAuthorName] = useState('')
  const [postGrade, setPostGrade] = useState('')
  const [topic, setTopic] = useState('')
  const [body, setBody] = useState('')
  const [replyOpenFor, setReplyOpenFor] = useState(null)
  const [error, setError] = useState('')
  const [reportTarget, setReportTarget] = useState(null)

  const subject = subjectChoice === 'Others' ? course : subjectChoice
  const channel = `${category}::${subject}`

  async function load() {
    let q = supabase
      .from('discussion_posts')
      .select('*')
      .eq('channel', channel)
      .eq('hidden', false)
      .order('created_at', { ascending: true })
    if (gradeFilter) q = q.eq('grade', gradeFilter)
    const { data } = await q
    setPosts(data || [])
  }

  useEffect(() => {
    load()
    const sub = supabase
      .channel(`discussions-${channel}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'discussion_posts', filter: `channel=eq.${channel}` }, load)
      .subscribe()
    return () => supabase.removeChannel(sub)
  }, [channel, gradeFilter])

  // Returns '' on success, or an error message to show.
  async function submitPost(parentId, text) {
    if (!authorName.trim()) return 'Add a display name first (or type Anonymous).'
    if (!postGrade) return 'Pick your grade level first.'
    if (!parentId && !topic.trim()) return 'Give this a short topic/title first.'
    if (containsProfanity(authorName) || containsProfanity(text) || containsProfanity(topic)) return 'Keep it appropriate, please.'
    if (!text.trim()) return 'Write something first.'
    const { error: insertError } = await supabase.from('discussion_posts').insert({
      channel,
      parent_id: parentId,
      author_name: authorName.trim().slice(0, 60),
      grade: postGrade,
      topic: parentId ? null : topic.trim().slice(0, 200),
      body: text.trim().slice(0, 4000),
    })
    if (insertError) return `Couldn't post: ${insertError.message}`
    if (parentId) setReplyOpenFor(null)
    load()
    return ''
  }

  async function postTopLevel() {
    const err = await submitPost(null, body)
    setError(err)
    if (!err) { setBody(''); setTopic('') }
  }

  async function vote(post, delta) {
    const deviceId = getDeviceId()
    // Voting goes through a database function so counts can't be set to arbitrary values.
    const { error: voteErr } = await supabase.rpc('vote_post', { p_post: post.id, p_device: deviceId, p_vote: delta })
    if (voteErr) {
      // Function not installed yet (migration-9 not run): use the old route so voting keeps working.
      if (voteErr.code === 'PGRST202') {
        const { error: legacyErr } = await supabase.from('post_votes').insert({ post_id: post.id, device_id: deviceId, vote: delta })
        if (legacyErr) return
        const field = delta > 0 ? 'upvotes' : 'downvotes'
        await supabase.from('discussion_posts').update({ [field]: (post[field] || 0) + 1 }).eq('id', post.id)
        load()
      }
      return // already voted on this post from this device
    }
    load()
  }

  async function submitReport(reason, detail) {
    const { error: reportError } = await supabase.from('reports').insert({
      target_type: 'discussion_post',
      target_id: reportTarget.id,
      reason,
      detail: detail || null,
      content_snapshot: reportTarget.body,
      device_id: getDeviceId(),
    })
    if (reportError) throw new Error(reportError.message)
  }

  const childrenOf = (id) => posts.filter((p) => p.parent_id === id)
  const topLevel = childrenOf(null)

  const ctx = {
    childrenOf,
    replyOpenFor,
    setReplyOpenFor,
    onVote: vote,
    onReport: setReportTarget,
    onReply: submitPost,
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="font-display text-4xl mb-6">Discussions</h1>

      <div className="flex gap-2 mb-4">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`font-body text-sm px-4 py-2 border ${
              category === c ? 'bg-library text-parchment border-library' : 'bg-parchmentDark text-ink border-ink/25'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={subjectChoice}
          onChange={(e) => setSubjectChoice(e.target.value)}
          className="font-body text-sm border border-ink/25 bg-parchment text-ink px-3 py-2"
        >
          {SUBJECT_CHOICES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        {subjectChoice === 'Others' && (
          <select
            value={course}
            onChange={(e) => setCourse(e.target.value)}
            className="font-body text-sm border border-ink/25 bg-parchment text-ink px-3 py-2"
          >
            {GRADE9_COURSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        )}
        <select
          value={gradeFilter}
          onChange={(e) => setGradeFilter(e.target.value)}
          className="font-body text-sm border border-ink/25 bg-parchment text-ink px-3 py-2"
        >
          <option value="">All grades</option>
          {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
        </select>
      </div>

      <div className="bg-parchmentDark border border-ink/20 shadow-card p-5 mb-8">
        <div className="flex flex-wrap gap-3 mb-3">
          <input
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="Your display name, or 'Anonymous'"
            className="flex-1 min-w-[160px] font-body text-sm border border-ink/25 bg-parchment px-3 py-2"
          />
          <select
            value={postGrade}
            onChange={(e) => setPostGrade(e.target.value)}
            className="font-body text-sm border border-ink/25 bg-parchment text-ink px-3 py-2"
          >
            <option value="">Your grade…</option>
            {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic — what's this about? e.g. 'Quadratic formula, when to use it'"
          className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 mb-3"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={category === 'Q&A' ? 'Ask a question or answer one — give working, not just a final answer...' : 'Share a tip or start a conversation...'}
          className="w-full font-body text-sm border border-ink/25 bg-parchment px-3 py-2 h-24 resize-none mb-3"
        />
        {error && <p className="font-body text-sm text-oxblood mb-2">{error}</p>}
        <button onClick={postTopLevel} className="bg-library text-parchment font-body text-sm px-5 py-2 shadow-card hover:shadow-cardHover">
          Post
        </button>
      </div>

      <div className="space-y-5">
        {topLevel.length === 0 && <p className="font-body text-inkSoft">No posts yet here — start one.</p>}
        {topLevel.map((post) => (
          <div key={post.id} className="tilt-card bg-parchment border border-ink/20 shadow-card p-5">
            <PostNode post={post} depth={0} ctx={ctx} />
          </div>
        ))}
      </div>

      {reportTarget && <ReportModal onSubmit={submitReport} onClose={() => setReportTarget(null)} />}
    </div>
  )
}
