import { lazy, Suspense } from 'react'
import { Link } from 'react-router-dom'

const WhaleHero = lazy(() => import('../components/whale/WhaleHero'))

const SECTIONS = [
  { to: '/past-papers', title: 'Past papers', desc: 'Summatives and formatives, sorted by grade and subject.' },
  { to: '/lesson-slides', title: 'Lesson slides', desc: 'Class slides shared by students, ready to revisit.' },
  { to: '/study-guides', title: 'Study guides', desc: 'Guides and tips from students, other schools, or creators.' },
  { to: '/discussions', title: 'Discussions', desc: 'Ask, answer, and rate the most useful explanations.' },
]

export default function Home() {
  return (
    <div>
      <Suspense fallback={<div className="w-full h-screen" style={{ background: 'linear-gradient(180deg, #0a0e1a, #030508)' }} />}>
        <WhaleHero />
      </Suspense>

      <div className="max-w-5xl mx-auto px-4 py-16">
        <p className="stamp text-xs text-oxblood mb-3">Browse the archive</p>
        <div className="grid sm:grid-cols-2 gap-5">
          {SECTIONS.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="tilt-card block bg-parchmentDark border border-ink/20 shadow-card hover:shadow-cardHover transition-shadow p-6"
            >
              <h2 className="font-display text-xl mb-1">{s.title}</h2>
              <p className="font-body text-sm text-inkSoft">{s.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
