import { useRef, useState } from 'react'
import { supabase } from '../supabaseClient'

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [text, setText] = useState('')
  const pos = useRef({ x: 24, y: 24 })
  const [coords, setCoords] = useState(pos.current)
  const dragging = useRef(false)

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
    await supabase.from('resource_requests').insert({
      subject: 'Feedback',
      description: text.trim(),
    })
    setSent(true)
    setText('')
    setTimeout(() => {
      setSent(false)
      setOpen(false)
    }, 1500)
  }

  return (
    <div
      style={{ position: 'fixed', right: coords.x, bottom: coords.y, zIndex: 50 }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      {open && (
        <div className="mb-3 w-64 bg-parchmentDark border border-ink/20 shadow-card p-4">
          <p className="stamp text-xs text-oxblood mb-2">Feedback corner</p>
          {sent ? (
            <p className="font-body text-sm">Thanks — got it!</p>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="What should we fix or add?"
                className="w-full text-sm font-body p-2 border border-ink/20 bg-parchment mb-2 h-20 resize-none"
              />
              <button
                onClick={submit}
                className="w-full bg-library text-parchment text-sm font-body py-2 shadow-card hover:shadow-cardHover"
              >
                Send
              </button>
            </>
          )}
        </div>
      )}
      <button
        onPointerDown={onPointerDown}
        onClick={() => setOpen((o) => !o)}
        className="stamp text-xs bg-ink/80 backdrop-blur text-parchment px-4 py-3 shadow-card cursor-grab active:cursor-grabbing"
      >
        Feedback
      </button>
    </div>
  )
}
