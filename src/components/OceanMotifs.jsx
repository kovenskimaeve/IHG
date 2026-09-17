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

// A layered ocean-floor scene meant to sit along the bottom edge of a dark
// section: a smooth, gently rolling sandy seabed with a handful of solid,
// clearly-legible coral mounds and kelp blades rising off it. Filled shapes
// throughout (not thin strokes) so it reads at a glance rather than
// disappearing into the dark background.
export function ReefSilhouette({ color = '#0a1f2e', accent = '#8fb3d9', className }) {
  function CoralCluster({ x, y, scale = 1 }) {
    return (
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <ellipse cx="0" cy="0" rx="26" ry="18" fill={accent} opacity="0.55" />
        <ellipse cx="-18" cy="7" rx="16" ry="11" fill={accent} opacity="0.5" />
        <ellipse cx="20" cy="9" rx="14" ry="10" fill={accent} opacity="0.45" />
        <ellipse cx="-4" cy="-8" rx="10" ry="7" fill="#ffffff" opacity="0.12" />
      </g>
    )
  }

  function Kelp({ x, y, height = 110, lean = 10 }) {
    return (
      <path
        d={`M${x} ${y} C${x - 10} ${y - height * 0.4},${x - lean} ${y - height * 0.75},${x} ${y - height}
            C${x + lean} ${y - height * 0.75},${x + 10} ${y - height * 0.4},${x} ${y}Z`}
        fill={accent}
        opacity="0.32"
      />
    )
  }

  return (
    <svg
      viewBox="0 0 1200 240"
      preserveAspectRatio="none"
      className={className}
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      {/* distant, softer dune further back */}
      <path
        fill={color}
        opacity="0.5"
        d="M0 240V200C120 175,260 175,380 195C500 215,620 165,760 175C900 185,1000 155,1120 165C1160 168,1180 172,1200 178V240Z"
      />

      {/* near seabed: smooth rolling sand, not jagged rock */}
      <path
        fill={color}
        d="M0 240V212C90 188,180 168,300 182C420 196,470 150,600 160C730 170,790 140,930 150C1030 157,1090 168,1150 172C1170 174,1190 176,1200 178V240Z"
      />

      <Kelp x={230} y={190} height={120} lean={14} />
      <Kelp x={555} y={158} height={140} lean={-12} />
      <Kelp x={1010} y={155} height={110} lean={10} />

      <CoralCluster x={130} y={198} scale={1.05} />
      <CoralCluster x={420} y={188} scale={0.85} />
      <CoralCluster x={680} y={152} scale={1.15} />
      <CoralCluster x={870} y={158} scale={0.8} />
      <CoralCluster x={1110} y={168} scale={0.95} />
    </svg>
  )
}
