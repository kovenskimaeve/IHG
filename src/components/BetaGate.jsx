import { useEffect, useState } from 'react'
import { getSessionToken, applySession } from '../supabaseClient'

// Set VITE_BETA_GATE_ENABLED=false (and OPEN_ACCESS=true on the server) when the
// site goes public. Visitors then get a session automatically, no code needed.
const GATE_ENABLED = import.meta.env.VITE_BETA_GATE_ENABLED !== 'false'

async function post(action, payload) {
  const res = await fetch('/api/beta-access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, payload }),
  })
  return res.json()
}

export default function BetaGate({ children }) {
  // This screen is only the friendly front door. The real lock is server-side:
  // without a token signed by the server, the database and the file endpoints
  // refuse every request, whatever is typed into this browser's storage.
  const [authed, setAuthed] = useState(() => !!getSessionToken())
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  useEffect(() => {
    if (GATE_ENABLED || authed) return
    post('open', {}).then((r) => {
      if (r.ok) { applySession(r.token); setAuthed(true) }
      else setError(r.error || 'Could not open the site.')
    }).catch(() => setError("Couldn't reach the server."))
  }, [authed])

  // If the session quietly expires while the tab is open, show the door again.
  useEffect(() => {
    if (!authed) return
    const id = setInterval(() => { if (!getSessionToken()) setAuthed(false) }, 60000)
    return () => clearInterval(id)
  }, [authed])

  if (authed) return children

  async function submit() {
    if (!code.trim() || checking) return
    setChecking(true)
    setError('')
    try {
      const result = await post('redeem', { code })
      if (!result.ok) {
        setError(result.error || 'Something went wrong.')
        return
      }
      applySession(result.token)
      setAuthed(true)
    } catch {
      setError("Couldn't reach the server — check your connection and try again.")
    } finally {
      setChecking(false)
    }
  }

  if (!GATE_ENABLED) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ background: '#050a12' }}>
        <p className="font-body text-sm" style={{ color: 'rgba(232,236,241,0.6)' }}>{error || 'Opening…'}</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'linear-gradient(180deg, #050a12, #0d2438)' }}>
      <div className="w-full max-w-sm rounded-2xl p-6 border" style={{ background: 'rgba(255,255,255,0.06)', borderColor: 'rgba(255,255,255,0.15)' }}>
        <p className="stamp text-xs mb-2" style={{ color: '#bcd6ea' }}>Private testing</p>
        <h1 className="font-display text-xl mb-3" style={{ color: '#e8ecf1' }}>ISF Holy Grail</h1>
        <p className="font-body text-sm mb-4" style={{ color: 'rgba(232,236,241,0.65)' }}>
          This site is in closed testing right now. Enter the invite code you were given to continue.
        </p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Invite code"
          autoFocus
          autoComplete="off"
          className="w-full font-body text-sm border rounded-lg px-3 py-2 mb-3 bg-transparent text-white placeholder-white/40"
          style={{ borderColor: 'rgba(255,255,255,0.25)' }}
        />
        {error && <p className="font-body text-xs mb-3" style={{ color: '#e08a8a' }}>{error}</p>}
        <button
          onClick={submit}
          disabled={checking}
          className="w-full font-body text-sm rounded-lg py-2 disabled:opacity-60"
          style={{ background: '#8fb3d9', color: '#0d2438' }}
        >
          {checking ? 'Checking…' : 'Continue'}
        </button>
      </div>
    </div>
  )
}
