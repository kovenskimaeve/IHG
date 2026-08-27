function Whale({ width, top, duration, delay, reverse, flip, color, opacity }) {
  return (
    <div
      style={{
        position: 'absolute',
        top,
        width,
        left: reverse ? undefined : '-25%',
        right: reverse ? '-25%' : undefined,
        animation: `${reverse ? 'whale-swim-reverse' : 'whale-swim'} ${duration} ease-in-out infinite`,
        animationDelay: delay,
      }}
    >
      <svg viewBox="0 0 160 90" style={{ width: '100%', fill: color, opacity, transform: flip ? 'scaleX(-1)' : 'none' }}>
        <ellipse cx="70" cy="45" rx="58" ry="27" />
        <path d="M118 42 Q148 18 158 6 Q142 44 158 82 Q146 70 118 48 Z" />
        <path d="M55 62 Q66 84 84 66 Q70 60 55 62 Z" />
        <circle cx="28" cy="36" r="3" fill="#EAF0F4" />
      </svg>
    </div>
  )
}

export default function OceanScene() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <Whale width={260} top="14%" duration="46s" delay="0s" color="#4C6B87" opacity={0.22} />
      <Whale width={170} top="62%" duration="34s" delay="-10s" color="#8AAFA0" opacity={0.18} reverse flip />
      <Whale width={120} top="38%" duration="58s" delay="-24s" color="#B79C6B" opacity={0.15} />
    </div>
  )
}
