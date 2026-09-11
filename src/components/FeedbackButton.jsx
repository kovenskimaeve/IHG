import { useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)
  const pos = useRef({ x: 24, y: 24 })
  const [coords, setCoords] = useState(pos.current)
  const dragging = useRef(false)
  const didDrag = useRef(false)

  function onPointerDown(e) {
    didDrag.current = false
    dragging.current = { startX: e.clientX, startY: e.clientY, ...coords }
  }
  function onPointerMove(e) {
    if (!dragging.current) return
    const dx = e.clientX - dragging.current.startX
    const dy = e.clientY - dragging.current.startY
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) didDrag.current = true
    setCoords({ x: Math.max(8, dragging.current.x - dx), y: Math.max(8, dragging.current.y - dy) })
  }
  function onPointerUp() {
    dragging.current = false
  }

  async function submit() {
    if (!text.trim() || sending) return
    setError('')
    setSending(true)
    try {
      // Feedback is private: only admins can read it back (see supabase/migration-3.sql).
      // This table has no public SELECT policy, so this insert-only call is all a
      // regular visitor's browser is ever able to do with it.
      const { error: insertError } = await supabase.from('feedback').insert({
        message: text.trim(),
      })
      if (insertError) throw insertError
      setSent(true)
      setText('')
      setTimeout(() => setSent(false), 1500)
    } catch (err) {
      console.error('[Feedback] send failed:', err)
      setError(
        err?.message?.includes('Failed to fetch')
          ? "Couldn't reach the server — check your connection and try again."
          : `Couldn't send: ${err?.message || 'unknown error'}`
      )
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      style={{ position: 'fixed', right: coords.x, bottom: coords.y, zIndex: 50 }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {open && (
        <div className="mb-3 w-72 bg-parchmentDark border border-ink/20 shadow-card p-4">
          <p className="stamp text-xs text-oxblood mb-1">Message in a bottle 🍾</p>
          <p className="font-body text-[11px] text-inkSoft mb-2">
            Private — only admins can read this, no one else.
          </p>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What should we fix or add?"
            className="w-full text-sm font-body p-2 border border-ink/20 bg-parchment mb-2 h-16 resize-none"
          />
          {error && <p className="font-body text-xs text-oxblood mb-2">{error}</p>}
          {sent && <p className="font-body text-xs text-libraryDeep mb-2">Thanks — got it!</p>}
          <button
            onClick={submit}
            disabled={sending}
            className="w-full bg-library text-parchment text-sm font-body py-2 shadow-card hover:shadow-cardHover disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </div>
      )}
      <button
        onPointerDown={onPointerDown}
        onClick={() => { if (!didDrag.current) setOpen((o) => !o) }}
        className="stamp text-xs bg-ink text-parchment px-4 py-3 shadow-card cursor-grab active:cursor-grabbing"
      >
        🍾 Message
      </button>
    </div>
  )
}
