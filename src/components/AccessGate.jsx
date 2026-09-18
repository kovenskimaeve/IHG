import { useState } from 'react'

const STORAGE_KEY = 'isf_access_granted'

export function hasAccess() {
  return localStorage.getItem(STORAGE_KEY) === 'true'
}

export default function AccessGate({ children, code }) {
  const [granted, setGranted] = useState(hasAccess())
  const [input, setInput] = useState('')
  const [error, setError] = useState('')

  // No code configured (VITE_ACCESS_CODE unset/empty) -> gate is off entirely.
  if (!code || granted) return children

  function submit() {
    if (input.trim() === code) {
      localStorage.setItem(STORAGE_KEY, 'true')
      setGranted(true)
    } else {
      setError('Not quite — check the code and try again.')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'radial-gradient(circle at 50% 20%, #17293b 0%, #060a14 70%)' }}
    >
      <div
        className="max-w-sm w-full p-8 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 0 40px rgba(76,107,135,0.25)',
        }}
      >
        <p className="stamp text-xs" style={{ color: '#B79C6B' }}>Testing phase</p>
        <h1 className="shine-text font-display text-2xl mb-2 mt-1">Invite-only right now</h1>
        <p className="font-body text-sm mb-5" style={{ color: 'rgba(232,236,241,0.6)' }}>
          ISF Holy Grail is limited to invited testers while we check
          everything works. Enter your access code to continue.
        </p>
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setError('') }}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Access code"
          className="w-full font-body text-sm px-3 py-2.5 mb-3"
          style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '8px', color: '#e8ecf1' }}
        />
        {error && <p className="font-body text-xs mb-3" style={{ color: '#c98a9c' }}>{error}</p>}
        <button
          onClick={submit}
          className="w-full font-body font-medium py-3 transition-opacity"
          style={{ background: '#586780', color: '#EAF0F4', borderRadius: '10px' }}
        >
          Continue
        </button>
      </div>
    </div>
  )
}
