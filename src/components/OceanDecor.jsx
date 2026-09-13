// Subtle line-art ocean silhouettes scattered behind the archive content —
// coral, kelp, and a shell — tinted to match the section and kept low-opacity
// so they read as ambient texture, not clutter. Purely decorative.
function Coral({ className, opacity = 0.16 }) {
  return (
    <svg viewBox="0 0 120 120" className={className} style={{ opacity }} aria-hidden="true">
      <g fill="none" stroke="#8ec7dd" strokeWidth="2.5" strokeLinecap="round">
        <path d="M60 118 V70" />
        <path d="M60 90 C40 90 34 74 40 58" />
        <path d="M40 58 C34 48 40 36 50 34" />
        <path d="M60 78 C74 78 82 64 76 48" />
        <path d="M76 48 C82 38 76 26 64 24" />
        <path d="M60 70 C60 56 66 44 60 30" />
      </g>
    </svg>
  )
}

function Kelp({ className, opacity = 0.14 }) {
  return (
    <svg viewBox="0 0 60 200" className={className} style={{ opacity }} aria-hidden="true">
      <g fill="none" stroke="#8ec7dd" strokeWidth="2.5" strokeLinecap="round">
        <path d="M12 200 C4 160 24 150 14 110 C6 80 26 66 18 30" />
        <path d="M32 200 C40 150 20 140 32 96 C40 66 24 50 34 10" />
      </g>
    </svg>
  )
}

function Shell({ className, opacity = 0.16 }) {
  return (
    <svg viewBox="0 0 100 80" className={className} style={{ opacity }} aria-hidden="true">
      <g fill="none" stroke="#8ec7dd" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M50 12 C20 30 8 55 8 70 H92 C92 55 80 30 50 12 Z" />
        <path d="M50 12 V70 M32 22 V70 M68 22 V70 M18 42 V70 M82 42 V70" />
      </g>
    </svg>
  )
}

export default function OceanDecor() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <Kelp className="absolute -left-2 top-8 w-10 h-40 sway-slow" />
      <Kelp className="absolute left-10 top-2 w-6 h-28 sway-slow" style={{ animationDelay: '-3s' }} />
      <Coral className="absolute right-4 top-16 w-24 h-24 sway-slow" style={{ animationDelay: '-1.5s' }} />
      <Shell className="absolute right-10 bottom-10 w-20 h-16" />
      <Coral className="absolute left-6 bottom-6 w-16 h-16 sway-slow" />
    </div>
  )
}
