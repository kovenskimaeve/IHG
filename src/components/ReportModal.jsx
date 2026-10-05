import { useState } from 'react'

const REASONS = [
  'Spam',
  'Harassment or bullying',
  'Inappropriate content',
  "Doesn't belong here / wrong subject",
  'Other',
]

export default function ReportModal({ onSubmit, onClose }) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [error, setError] = useState('')
  const [sending, setSending] = useState(false)

  async function submit() {
    if (!reason) return setError('Pick a reason.')
    if (reason === 'Other' && !detail.trim()) return setError('Say a bit more so an admin knows what to look for.')
    setSending(true)
    setError('')
    try {
      await onSubmit(reason, detail.trim())
      onClose()
    } catch (err) {
      setError(err?.message || 'Something went wrong — try again.')
      setSending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-ink/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-parchment w-full max-w-sm shadow-card p-5" onClick={(e) => e.stopPropagation()}>
        <p className="font-display text-lg mb-1">Report this</p>
        <p className="font-body text-xs text-inkSoft mb-4">
          This sends a report to an admin to review — it won't be taken down automatically.
        </p>
        <div className="space-y-2 mb-3">
          {REASONS.map((r) => (
            <label key={r} className="flex items-center gap-2 font-body text-sm cursor-pointer">
              <input type="radio" name="report-reason" checked={reason === r} onChange={() => setReason(r)} />
              {r}
            </label>
          ))}
        </div>
        <textarea
          value={detail}
          onChange={(e) => setDetail(e.target.value)}
          placeholder={reason === 'Other' ? 'What happened? (required)' : 'Anything else an admin should know? (optional)'}
          className="w-full font-body text-sm border border-ink/25 bg-parchmentDark px-3 py-2 h-16 resize-none mb-3"
        />
        {error && <p className="font-body text-xs text-oxblood mb-3">{error}</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="font-body text-sm text-inkSoft underline">Cancel</button>
          <button
            onClick={submit}
            disabled={sending}
            className="flex-1 bg-library text-parchment font-body text-sm py-2 shadow-card disabled:opacity-60"
          >
            {sending ? 'Sending…' : 'Submit report'}
          </button>
        </div>
      </div>
    </div>
  )
}
