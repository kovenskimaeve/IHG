import { useState } from 'react'

const STEPS = [
  'Browse past papers, lesson slides, and study guides by grade and subject.',
  'Open any file for a quick preview before downloading it.',
  'In Discussions, ask questions and answer others — upvote what helped you.',
  'Made something useful? Upload it so the next student has it too.',
]

export default function Tutorial({ onClose }) {
  const [step, setStep] = useState(0)
  const last = step === STEPS.length - 1

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center px-4 z-50">
      <div className="max-w-md w-full bg-parchmentDark border border-ink/20 shadow-card p-8">
        <p className="stamp text-xs text-oxblood mb-2">Quick tour · {step + 1}/{STEPS.length}</p>
        <p className="font-body text-base leading-relaxed mb-6">{STEPS[step]}</p>
        <div className="flex justify-between items-center">
          <button onClick={onClose} className="font-body text-sm text-inkSoft underline">
            Skip
          </button>
          <button
            onClick={() => (last ? onClose() : setStep(step + 1))}
            className="bg-library text-parchment font-body text-sm px-5 py-2 shadow-card hover:shadow-cardHover transition-shadow"
          >
            {last ? "Let's go" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
