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
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full bg-parchmentDark border border-ink/20 shadow-card p-8">
        <p className="stamp text-xs text-oxblood mb-2">Before you enter</p>
        <h1 className="font-display text-3xl mb-4">Terms &amp; agreement</h1>
        <div className="font-body text-sm leading-relaxed text-inkSoft space-y-3 mb-6">
          <p>
            ISF Holy Grail is a student-run study archive, not a homework
            shortcut. Everything here is for learning, not for completing
            graded work.
          </p>
          <p>
            No copying personal essays, no posting school assignments
            word-for-word, and no answers without your own explanation in
            your own words. Be appropriate — no profanity, no harassment.
          </p>
          <p>
            If a teacher reports that something here was used to cheat on a
            graded assignment, we will share the uploader's school email
            with them. Breaking the rules leads to a strike system: a
            one-day, then one-week, then permanent block for that device.
          </p>
        </div>
        <label className="flex items-start gap-3 mb-6 cursor-pointer">
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
            className="mt-1 accent-library"
          />
          <span className="font-body text-sm">
            I've read this and agree to use ISF Holy Grail responsibly.
          </span>
        </label>
        <button
          onClick={handleAgree}
          disabled={!checked}
          className="w-full bg-library text-parchment font-body font-medium py-3 shadow-card hover:shadow-cardHover transition-shadow disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Enter the archive
        </button>
      </div>
    </div>
  )
}
