import { Link } from 'react-router-dom'

const SECTIONS = [
  { to: '/past-papers', title: 'Past papers', desc: 'Summatives and formatives, sorted by grade and subject.' },
  { to: '/lesson-slides', title: 'Lesson slides', desc: 'Class slides shared by students, ready to revisit.' },
  { to: '/study-guides', title: 'Study guides', desc: 'Guides and tips from students, other schools, or creators.' },
  { to: '/discussions', title: 'Discussions', desc: 'Ask, answer, and rate the most useful explanations.' },
]

export default function Home() {
  return (
    <div className="max-w-5xl mx-auto px-4 py-16">
      <p className="stamp text-xs text-oxblood mb-3">Est. this year · ISF student-run</p>
      <h1 className="font-display text-5xl leading-tight mb-4 max-w-2xl relative">
        Every past paper, every good explanation, kept in one place.
        <span className="float-accent absolute -top-2 -right-6 text-2xl" aria-hidden="true" style={{ animationDelay: '0s' }}>✦</span>
        <span className="float-accent absolute top-10 right-10 text-lg" aria-hidden="true" style={{ animationDelay: '2s' }}>✦</span>
      </h1>
      <p className="font-body text-inkSoft max-w-xl mb-12">
        Built by a student, for students. Everything here is uploaded and
        answered by people who sat the same classes you did.
      </p>
      <div className="grid sm:grid-cols-2 gap-5">
        {SECTIONS.map((s) => (
          <Link
            key={s.to}
            to={s.to}
            className="block bg-parchmentDark border border-ink/20 shadow-card hover:shadow-cardHover transition-shadow p-6"
          >
            <h2 className="font-display text-xl mb-1">{s.title}</h2>
            <p className="font-body text-sm text-inkSoft">{s.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
