export default function MaintenanceScreen() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 text-center"
      style={{ background: 'linear-gradient(180deg, #020408 0%, #0d2438 60%, #123044 100%)' }}
    >
      <div className="max-w-md">
        <p className="stamp text-sm mb-3" style={{ color: '#bcd6ea' }}>Back soon</p>
        <h1 className="font-display text-3xl md:text-4xl mb-4" style={{ color: '#e8ecf1' }}>
          Diving for a bit.
        </h1>
        <p className="font-body text-sm leading-relaxed" style={{ color: 'rgba(232,236,241,0.65)' }}>
          ISF Holy Grail is offline for a short maintenance break. Nothing
          anyone has posted has been lost — check back in a little while.
        </p>
      </div>
    </div>
  )
}
