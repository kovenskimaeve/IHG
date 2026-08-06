import { NavLink } from 'react-router-dom'

const LINKS = [
  { to: '/past-papers', label: 'Past papers' },
  { to: '/lesson-slides', label: 'Lesson slides' },
  { to: '/study-guides', label: 'Study guides' },
  { to: '/discussions', label: 'Discussions' },
  { to: '/study-links', label: 'Study links' },
  { to: '/requests', label: 'Requests' },
  { to: '/upload', label: 'Upload' },
]

export default function Navbar() {
  return (
    <header className="border-b border-ink/20 bg-parchment sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between flex-wrap gap-3">
        <NavLink to="/" className="font-display text-2xl">
          ISF Holy Grail
        </NavLink>
        <nav className="flex flex-wrap gap-x-5 gap-y-1 font-body text-sm">
          {LINKS.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `pb-0.5 border-b-2 transition-colors ${
                  isActive
                    ? 'border-oxblood text-oxblood'
                    : 'border-transparent hover:border-ink/30'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  )
}
