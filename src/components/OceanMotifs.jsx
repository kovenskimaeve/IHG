// Small decorative line-art motifs for the ocean-themed sections of the site.
// Drawn in the same thin-stroke style as the lucide icons used elsewhere, so
// they read as part of the same visual language rather than clip-art.

export function Coral({ size = 64, color = '#bcd6ea', opacity = 0.35, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} style={{ opacity }} aria-hidden="true">
      <path
        d="M32 58V34M32 34c0-8 6-10 6-18M32 34c0-9-7-12-7-20M32 40c6 2 11-1 15 4M32 40c-6 1-10-2-15 3M32 22c3-3 8-3 10-8M32 22c-3-4-8-4-9-9"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Shell({ size = 64, color = '#bcd6ea', opacity = 0.35, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} style={{ opacity }} aria-hidden="true">
      <path
        d="M32 54C18 54 10 44 10 32 10 18 20 10 32 10s22 8 22 22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path d="M32 54V16M22 52c-2-12 2-24 10-36M42 52c2-12-2-24-10-36" stroke={color} strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
    </svg>
  )
}

export function Seaweed({ size = 64, color = '#bcd6ea', opacity = 0.35, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} style={{ opacity }} aria-hidden="true">
      <path d="M22 58C18 44 26 40 20 28c-4-8 2-14 4-20" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M32 58C30 42 40 38 34 24c-3-6 1-12 4-16" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M44 58c-4-12 4-18-2-28" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export function Bubbles({ size = 64, color = '#bcd6ea', opacity = 0.3, className }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} style={{ opacity }} aria-hidden="true">
      <circle cx="24" cy="46" r="6" stroke={color} strokeWidth="1.6" />
      <circle cx="40" cy="30" r="4" stroke={color} strokeWidth="1.6" />
      <circle cx="30" cy="18" r="2.5" stroke={color} strokeWidth="1.6" />
      <circle cx="46" cy="14" r="1.6" stroke={color} strokeWidth="1.6" />
    </svg>
  )
}

// A quiet reef silhouette meant to sit along the bottom edge of a dark
// section, blending into the gradient behind it.
export function ReefSilhouette({ color = '#0a1f2e', className }) {
  return (
    <svg
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path
        fill={color}
        d="M0 120V88c20-10 40 6 60-2s30-18 55-16 35 16 60 10 40-20 65-14 30 18 55 12 45-22 70-14 35 18 60 10 40-16 65-10 35 14 60 8 45-18 70-12 40 16 65 10 30-10 55-4v72Z"
      />
    </svg>
  )
}
