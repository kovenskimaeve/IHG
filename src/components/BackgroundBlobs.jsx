export default function BackgroundBlobs() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      <div className="blob" style={{ width: 560, height: 560, top: '-15%', left: '-12%', background: '#8AAFA0', animationDuration: '24s' }} />
      <div className="blob" style={{ width: 500, height: 500, top: '50%', left: '65%', background: '#4C6B87', animationDuration: '30s', animationDelay: '-8s' }} />
      <div className="blob" style={{ width: 380, height: 380, top: '5%', left: '58%', background: '#B79C6B', animationDuration: '20s', animationDelay: '-4s' }} />
      <div className="blob" style={{ width: 340, height: 340, top: '75%', left: '5%', background: '#5C8A7A', animationDuration: '26s', animationDelay: '-14s' }} />
    </div>
  )
}
