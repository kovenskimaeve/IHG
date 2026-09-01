// Subtle background motion for every page except Home (which has the real
// 3D whale). Simple, elegant silhouettes — not the old cartoony version —
// and careful about direction: unflipped shapes face right and drift
// right, flipped shapes face left and drift left, so they always swim
// head-first the way they're moving.

function Silhouette({ top, width, duration, delay, flip, color, opacity }) {
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
      <svg viewBox="0 0 160 70" style={{ width: '100%', fill: color, opacity, transform: flip ? 'scaleX(-1)' : 'none' }}>
        <path d="M10 40 Q30 15 70 14 Q110 13 140 30 Q150 34 158 32 Q150 40 158 48 Q150 46 138 42 Q110 55 65 52 Q30 50 10 40 Z" />
        <path d="M55 50 Q62 64 76 55 Q65 50 55 50 Z" />
      </svg>
    </div>
  )
}

export default function SeaDrift() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <Silhouette top="8%" width={130} duration="52s" delay="0s" color="#586780" opacity={0.06} />
      <Silhouette top="28%" width={90} duration="38s" delay="-14s" color="#8AAFA0" opacity={0.05} flip />
      <Silhouette top="55%" width={110} duration="60s" delay="-30s" color="#B79C6B" opacity={0.05} />
      <Silhouette top="72%" width={75} duration="44s" delay="-8s" color="#586780" opacity={0.05} flip />
      <Silhouette top="90%" width={100} duration="48s" delay="-20s" color="#8AAFA0" opacity={0.04} />
    </div>
  )
}
