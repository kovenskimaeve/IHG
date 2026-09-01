// Subtle background motion for every page except Home. Head is drawn on
// the RIGHT of the shape, tail/flukes on the LEFT. Unflipped copies drift
// rightward (head leads, correct), flipped copies mirror the shape AND
// drift leftward (head — now visually on the left after the mirror —
// still leads). That pairing is what was backwards before.

function Silhouette({ top, width, duration, delay, flip, gradId, stops, opacity }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        width,
        left: flip ? undefined : '-20%',
        right: flip ? '-20%' : undefined,
        animation: `${flip ? 'sea-drift-reverse' : 'sea-drift'} ${duration} ease-in-out infinite`,
        animationDelay: delay,
      }}
    >
      <svg viewBox="0 0 160 70" style={{ width: '100%', opacity, transform: flip ? 'scaleX(-1)' : 'none' }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            {stops.map((s, i) => <stop key={i} offset={s.offset} stopColor={s.color} />)}
          </linearGradient>
        </defs>
        {/* tail flukes, left end */}
        <path d="M2 34 Q14 22 22 34 Q14 46 2 34 Z" fill={`url(#${gradId})`} />
        {/* body, tapering to a pointed head on the right */}
        <path d="M18 34 Q40 20 85 22 Q125 24 156 34 Q125 44 85 46 Q40 48 18 34 Z" fill={`url(#${gradId})`} />
        {/* pectoral fin */}
        <path d="M70 44 Q78 58 92 47 Q80 43 70 44 Z" fill={`url(#${gradId})`} />
      </svg>
    </div>
  )
}

const PALETTE = [
  [{ offset: '0%', color: '#586780' }, { offset: '100%', color: '#B7C4D6' }],
  [{ offset: '0%', color: '#3E6B5E' }, { offset: '100%', color: '#9FCABB' }],
  [{ offset: '0%', color: '#8A6A3E' }, { offset: '100%', color: '#D9BE8F' }],
]

const SHAPES = [
  { top: '10%', width: 110, duration: '22s', delay: '0s', flip: false },
  { top: '24%', width: 80, duration: '18s', delay: '-6s', flip: true },
  { top: '40%', width: 130, duration: '26s', delay: '-12s', flip: false },
  { top: '56%', width: 70, duration: '16s', delay: '-3s', flip: true },
  { top: '70%', width: 100, duration: '20s', delay: '-9s', flip: false },
  { top: '84%', width: 90, duration: '24s', delay: '-16s', flip: true },
]

export default function SeaDrift() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {SHAPES.map((s, i) => (
        <Silhouette key={i} {...s} gradId={`sea-grad-${i}`} stops={PALETTE[i % PALETTE.length]} opacity={0.09} />
      ))}
    </div>
  )
}
