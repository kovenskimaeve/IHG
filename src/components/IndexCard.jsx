import { roleLabel } from '../lib/batches'

// One card per upload batch. A paper and its answers share a card; each file keeps its own
// Preview and Download.
export default function IndexCard({ title, grade, subject, meta, files, onPreview }) {
  return (
    <div className="tilt-card relative bg-parchmentDark border border-ink/10 shadow-card p-5">
      <div className="flex items-start justify-between gap-3 mb-2">
        <span className="stamp text-xs">{grade}</span>
        <span className="font-body text-xs text-inkSoft">{subject}</span>
      </div>
      <h3 className="font-display text-lg leading-snug mb-1">{title}</h3>
      {meta && <p className="font-body text-xs text-inkSoft mb-3">{meta}</p>}
      <div className="torn-edge pt-3 space-y-2">
        {files.map((f) => (
          <div key={f.id} className="flex items-center gap-4">
            {files.length > 1 && <span className="stamp text-xs w-16">{roleLabel(f.role)}</span>}
            <button onClick={() => onPreview(f.id)} className="font-body text-sm text-library underline">
              Preview
            </button>
            <a href={`/api/download?id=${f.id}`} className="font-body text-sm text-library underline">
              Download
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
