import { useEffect, useRef } from 'react'

// A soft radial glow that follows the pointer, meant to sit inside a dark
// section (absolute positioned parent with position:relative + overflow:hidden).
// Uses a CSS custom property updated via rAF rather than React state, so it
// never triggers a re-render while the mouse moves.
export default function SpotlightGlow({ color = 'rgba(120,190,220,0.35)' }) {
  const ref = useRef(null)

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const el = ref.current
    if (!el || prefersReduced) return

    let raf = null
    let x = 0.5
    let y = 0.4

    function onMove(e) {
      const rect = el.parentElement.getBoundingClientRect()
      x = (e.clientX - rect.left) / rect.width
      y = (e.clientY - rect.top) / rect.height
      if (raf) return
      raf = requestAnimationFrame(() => {
        el.style.setProperty('--spot-x', `${x * 100}%`)
        el.style.setProperty('--spot-y', `${y * 100}%`)
        raf = null
      })
    }

    const parent = el.parentElement
    parent.addEventListener('pointermove', onMove)
    return () => {
      parent.removeEventListener('pointermove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        '--spot-x': '50%',
        '--spot-y': '40%',
        background: `radial-gradient(480px circle at var(--spot-x) var(--spot-y), ${color}, transparent 70%)`,
        transition: 'background 0.15s ease-out',
        mixBlendMode: 'screen',
      }}
    />
  )
}
