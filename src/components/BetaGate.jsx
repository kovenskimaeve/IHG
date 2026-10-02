import { useState } from 'react'

const STORAGE_KEY = 'isf-holy-grail-beta-token'

// Set VITE_BETA_GATE_ENABLED=false in Vercel (and redeploy) to turn this off
// once you're ready for a wider release -- no code changes needed.
const GATE_ENABLED = import.meta.env.VITE_BETA_GATE_ENABLED !== 'false'

export default function BetaGate({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY))
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [checking, setChecking] = useState(false)

  if (!GATE_ENABLED || token) return children

  async function submit() {
    if (!code.trim() || checking) return
    setChecking(true)
    setError('')
    try {
      const res = await fetch('/api/beta-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'redeem', payload: { code } }),
      })
      const result = await res.json()
      if (!result.ok) {
        setError(result.error || 'Something went wrong.')
        return
      }
      localStorage.setItem(STORAGE_KEY, result.token)
      setToken(result.token)
    } catch {
      setError("Couldn't reach the server — check your connection and try again.")
    } finally {
      setChecking(false)
    }
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
