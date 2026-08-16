// Soft, slow-drifting blurred shapes behind every page. Pure decoration —
// fixed position, no pointer events, sits behind everything else.

export default function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="blob" style={{ width: 480, height: 480, top: '-10%', left: '-10%', background: '#8AAFA0', animationDuration: '26s' }} />
      <div className="blob" style={{ width: 420, height: 420, top: '55%', left: '70%', background: '#4C6B87', animationDuration: '32s', animationDelay: '-8s' }} />
      <div className="blob" style={{ width: 320, height: 320, top: '10%', left: '60%', background: '#B79C6B', animationDuration: '22s', animationDelay: '-4s' }} />
    </div>
  )
}
