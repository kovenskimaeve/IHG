import { useState } from 'react'
import { hasAgreed, setAgreed } from '../lib/device'

export default function AgreementGate({ children, onAgreed }) {
  const [agreed, setAgreedState] = useState(hasAgreed())
  const [checked, setChecked] = useState(false)

  if (agreed) return children

  function handleAgree() {
    if (!checked) return
    setAgreed()
    setAgreedState(true)
    onAgreed?.()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{ background: 'radial-gradient(circle at 50% 20%, #17293b 0%, #060a14 70%)' }}
    >
      <div
        className="max-w-lg w-full p-8 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.05)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255,255,255,0.14)',
          boxShadow: '0 0 40px rgba(76,107,135,0.25)',
        }}
      >
        <p className="stamp text-xs" style={{ color: '#B79C6B' }}>Before you enter</p>
        <h1 className="shine-text font-display text-3xl mb-2 mt-1">Terms &amp; agreement</h1>
        <p className="font-body text-sm mb-5" style={{ color: 'rgba(232,236,241,0.6)' }}>
          Grade 10 &amp; 11 coverage is filling in fast.
        </p>
        <div className="font-body text-sm leading-relaxed space-y-3 mb-6" style={{ color: 'rgba(232,236,241,0.75)' }}>
          <p>
            ISF Holy Grail is a student-run study archive, not a homework
            shortcut. Everything here is for learning, not for completing
            graded work.
          </p>
          <p>
            No copying personal essays, no posting school assignments
            word-for-word, and no answers without your own explanation in
            your own words. Be appropriate, no profanity, no harassment.
          </p>
          <p>
            Breaking the rules leads to a strike system: a one-day, then
            one-week, then permanent block for that device. Reports go to a
            human moderator before anything happens.
          </p>
        </div>
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 accent-library"
          />
          <span className="font-body text-sm" style={{ color: 'rgba(232,236,241,0.85)' }}>
            I've read this and agree to use ISF Holy Grail responsibly.
          </span>
        </label>
        <button
          onClick={handleAgree}
          disabled={!checked}
          className="w-full font-body font-medium py-3 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
          style={{ background: '#586780', color: '#EAF0F4', borderRadius: '10px' }}
        >
          Enter the archive
        </button>
      </div>
    </div>
  )
}
