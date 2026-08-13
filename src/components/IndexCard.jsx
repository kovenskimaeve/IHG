// Cottagecore pass: dropped the punch-hole/stamp-box look for something
// softer — rounded card, gentle hover tilt, a quiet italic label instead
// of a boxed rubber-stamp badge.

export default function IndexCard({ title, grade, subject, meta, onPreview, onDownload }) {
  return (
    <div className="tilt-card relative bg-parchmentDark border border-ink/10 shadow-card p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="stamp text-xs">{grade}</span>
        <span className="font-body text-xs text-inkSoft">{subject}</span>
      </div>
      <h3 className="font-display text-lg leading-snug mb-1">{title}</h3>
      {meta && <p className="font-body text-xs text-inkSoft mb-3">{meta}</p>}
      <div className="torn-edge pt-3 flex gap-4">
        <button onClick={onPreview} className="font-body text-sm text-library underline">
          Preview
        </button>
        <button onClick={onDownload} className="font-body text-sm text-library underline">
          Download
        </button>
      </div>
    </div>
  )
}
