// Subtle background motion for every page except Home. Three different
// silhouette shapes (whale, fish, ray) at varied sizes, all built with the
// same head-on-the-right / tail-on-the-left convention so the drift
// direction always matches which way they're facing.

function WhaleShape({ gradId }) {
  return (
    <>
      <path d="M2 34 Q14 22 22 34 Q14 46 2 34 Z" fill={`url(#${gradId})`} />
      <path d="M18 34 Q40 20 85 22 Q125 24 156 34 Q125 44 85 46 Q40 48 18 34 Z" fill={`url(#${gradId})`} />
      <path d="M70 44 Q78 58 92 47 Q80 43 70 44 Z" fill={`url(#${gradId})`} />
    </>
  )
}

function FishShape({ gradId }) {
  return (
    <>
      <path d="M0 35 Q16 18 22 35 Q16 52 0 35 Z" fill={`url(#${gradId})`} />
      <circle cx="120" cy="35" r="28" fill={`url(#${gradId})`} />
      <path d="M144 35 Q160 25 160 35 Q160 45 144 35 Z" fill={`url(#${gradId})`} />
    </>
  )
}

function RayShape({ gradId }) {
  return (
    <>
      <path d="M0 35 L20 28 L20 42 Z" fill={`url(#${gradId})`} />
      <path d="M18 35 Q60 5 110 35 Q60 65 18 35 Z" fill={`url(#${gradId})`} />
    </>
  )
}

const SHAPE_COMPONENTS = { whale: WhaleShape, fish: FishShape, ray: RayShape }

function Silhouette({ top, width, duration, delay, flip, gradId, stops, opacity, kind }) {
  const ShapeComp = SHAPE_COMPONENTS[kind]
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
        <ShapeComp gradId={gradId} />
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
  { top: '8%', width: 140, duration: '24s', delay: '0s', flip: false, kind: 'whale' },
  { top: '20%', width: 45, duration: '14s', delay: '-5s', flip: true, kind: 'fish' },
  { top: '35%', width: 90, duration: '20s', delay: '-11s', flip: false, kind: 'ray' },
  { top: '48%', width: 60, duration: '16s', delay: '-2s', flip: true, kind: 'fish' },
  { top: '62%', width: 160, duration: '28s', delay: '-18s', flip: false, kind: 'whale' },
  { top: '76%', width: 55, duration: '15s', delay: '-8s', flip: true, kind: 'fish' },
  { top: '88%', width: 100, duration: '22s', delay: '-14s', flip: false, kind: 'ray' },
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
