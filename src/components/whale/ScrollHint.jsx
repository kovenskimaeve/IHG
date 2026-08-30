import { useState } from 'react'

// A small techy scroll indicator that scatters into fading fragments on
// click instead of just disappearing.

export default function ScrollHint() {
  const [dispersing, setDispersing] = useState(false)
  const [gone, setGone] = useState(false)

  if (gone) return null

  function handleClick() {
    setDispersing(true)
    setTimeout(() => setGone(true), 650)
  }

  const shards = [
    { x: -18, y: -10 }, { x: 16, y: -14 }, { x: -8, y: 14 },
    { x: 12, y: 10 }, { x: 0, y: -20 }, { x: -14, y: 6 },
  ]

  return (
    <button
      onClick={handleClick}
      className="absolute bottom-6 right-6 md:right-10 flex flex-col items-center gap-1"
      style={{
        fontFamily: '"Space Mono", monospace',
        color: 'rgba(232,236,241,0.55)',
        fontSize: '0.65rem',
        letterSpacing: '0.2em',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        opacity: dispersing ? 0 : 1,
        transition: 'opacity 0.4s ease',
      }}
    >
      <span>SCROLL // EXPLORE</span>
      <span className="float-accent" style={{ fontSize: '1rem', position: 'relative' }}>
        ↓
        {shards.map((s, i) => (
          <span
            key={i}
            style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: dispersing ? `translate(${s.x}px, ${s.y}px)` : 'translate(0,0)',
              opacity: dispersing ? 0.9 : 0,
              transition: `transform 0.6s ease-out, opacity 0.6s ease-out`,
              transitionDelay: `${i * 20}ms`,
            }}
          >
            ·
          </span>
        ))}
      </span>
    </button>
  )
}
