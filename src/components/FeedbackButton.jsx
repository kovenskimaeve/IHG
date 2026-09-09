import { useEffect, useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [feed, setFeed] = useState([])
  const pos = useRef({ x: 24, y: 24 })
  const [coords, setCoords] = useState(pos.current)
  const dragging = useRef(false)

  async function loadFeed() {
    const { data } = await supabase
      .from('resource_requests')
      .select('*')
      .eq('subject', 'Feedback')
      .order('created_at', { ascending: false })
      .limit(20)
    setFeed(data || [])
  }

  useEffect(() => { if (open) loadFeed() }, [open])

  function onPointerDown(e) {
    dragging.current = { startX: e.clientX, startY: e.clientY, ...coords }
  }
  function onPointerMove(e) {
    if (!dragging.current) return
    const dx = e.clientX - dragging.current.startX
    const dy = e.clientY - dragging.current.startY
    setCoords({ x: Math.max(8, dragging.current.x - dx), y: Math.max(8, dragging.current.y - dy) })
  }
  function onPointerUp() {
    dragging.current = false
  }

  async function submit() {
    if (!text.trim()) return
    setError('')
    const { error: insertError } = await supabase.from('resource_requests').insert({
      subject: 'Feedback',
      description: text.trim(),
    })
    if (insertError) {
      setError(`Couldn't send: ${insertError.message}`)
      return
    }
    setSent(true)
    setText('')
    loadFeed()
    setTimeout(() => setSent(false), 1200)
  }

  return (
    <div
      style={{ position: 'fixed', right: coords.x, bottom: coords.y, zIndex: 50 }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {open && (
        <div className="mb-3 w-72 bg-parchmentDark border border-ink/20 shadow-card p-4">
          <p className="stamp text-xs text-oxblood mb-2">Message in a bottle 🍾</p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What should we fix or add?"
            className="w-full text-sm font-body p-2 border border-ink/20 bg-parchment mb-2 h-16 resize-none"
          />
          {error && <p className="font-body text-xs text-oxblood mb-2">{error}</p>}
          {sent && <p className="font-body text-xs text-library mb-2">Thanks — got it!</p>}
          <button
            onClick={submit}
            className="w-full bg-library text-parchment text-sm font-body py-2 shadow-card hover:shadow-cardHover mb-3"
          >
            Send
          </button>

          <p className="stamp text-[10px] text-inkSoft mb-2">Everyone's feedback, newest first</p>
          <div className="max-h-40 overflow-y-auto space-y-2 pr-1">
            {feed.length === 0 && <p className="font-body text-xs text-inkSoft">Nothing yet — be the first.</p>}
            {feed.map((f) => (
              <div key={f.id} className="torn-edge pb-2">
                <p className="font-body text-xs">{f.description}</p>
                <p className="stamp text-[9px] text-inkSoft">{new Date(f.created_at).toLocaleDateString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <button
        onPointerDown={onPointerDown}
        onClick={() => setOpen((o) => !o)}
        className="stamp text-xs bg-ink text-parchment px-4 py-3 shadow-card cursor-grab active:cursor-grabbing"
      >
        🍾 Message
      </button>
    </div>
  )
}
