// The signature element: every resource renders as a library index card —
// a stamped grade/subject badge, a punch-hole, a dashed tear line before
// the action row. This is the one distinctive visual idea the whole
// site is built around, so it stays consistent everywhere a resource appears.

export default function IndexCard({ title, grade, subject, meta, onPreview, onDownload }) {
  return (
    <div className="relative bg-parchment border border-ink/25 shadow-card hover:shadow-cardHover transition-shadow p-5 pl-8">
      <div
        className="absolute left-2.5 top-5 w-2.5 h-2.5 rounded-full bg-parchmentDark border border-ink/30"
        aria-hidden="true"
      />
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="stamp text-[10px] text-oxblood border border-oxblood/50 px-2 py-0.5">
          {grade}
        </span>
        <span className="stamp text-[10px] text-inkSoft">{subject}</span>
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
