import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, Presentation, BookOpen, MessagesSquare } from 'lucide-react'
import { supabase } from '../supabaseClient'
import SpotlightGlow from '../components/SpotlightGlow'
import OceanDecor from '../components/OceanDecor'
import HomeSearch from '../components/HomeSearch'
import ErrorBoundary from '../components/ErrorBoundary'
import { Coral, Shell, Seaweed, Bubbles, ReefSilhouette } from '../components/OceanMotifs'

const WhaleHero = lazy(() => import('../components/whale/WhaleHero'))
const heroFallback = <div className="w-full h-screen" style={{ background: 'linear-gradient(180deg, #0a0e1a, #030508)' }} />

const SECTIONS = [
  {
    to: '/past-papers',
    title: 'Past papers',
    desc: 'Summatives and formatives, sorted by grade and subject.',
    icon: FileText,
    span: 'sm:col-span-2 sm:row-span-2',
    countKey: 'past_paper',
    countLabel: 'papers shared',
    Motif: Coral,
    motifSize: 110,
    accent: '#8fb3d9',
  },
  {
    to: '/lesson-slides',
    title: 'Lesson slides',
    desc: 'Class slides shared by students, ready to revisit.',
    icon: Presentation,
    span: 'sm:col-span-1',
    countKey: 'lesson_slide',
    countLabel: 'decks shared',
    Motif: Bubbles,
    motifSize: 64,
    accent: '#d9a86c',
  },
  {
    to: '/study-guides',
    title: 'Study guides',
    desc: 'Guides and tips from students, other schools, or creators.',
    icon: BookOpen,
    span: 'sm:col-span-1',
    countKey: 'study_guide',
    countLabel: 'guides shared',
    Motif: Shell,
    motifSize: 64,
    accent: '#7ac9b8',
  },
  {
    to: '/discussions',
    title: 'Discussions',
    desc: 'Ask, answer, and rate the most useful explanations.',
    icon: MessagesSquare,
    span: 'sm:col-span-2',
    countKey: 'discussions',
    countLabel: 'posts this week',
    Motif: Seaweed,
    motifSize: 78,
    accent: '#c98a9c',
  },
]

export default function Home() {
  const [counts, setCounts] = useState({})

  useEffect(() => {
    let cancelled = false
    async function loadCounts() {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
      const [papers, slides, guides, discussions] = await Promise.all([
        supabase.from('files').select('id', { count: 'exact', head: true }).eq('type', 'past_paper'),
        supabase.from('files').select('id', { count: 'exact', head: true }).eq('type', 'lesson_slide'),
        supabase.from('files').select('id', { count: 'exact', head: true }).eq('type', 'study_guide'),
        supabase.from('discussion_posts').select('id', { count: 'exact', head: true }).gte('created_at', weekAgo),
      ])
      if (cancelled) return
      setCounts({
        past_paper: papers.count || 0,
        lesson_slide: slides.count || 0,
        study_guide: guides.count || 0,
        discussions: discussions.count || 0,
      })
    }
    loadCounts()
    return () => { cancelled = true }
  }, [])

  return (
    <div>
      <ErrorBoundary fallback={heroFallback}>
        <Suspense fallback={heroFallback}>
          <WhaleHero />
        </Suspense>
      </ErrorBoundary>

      <div
        id="archive"
        className="relative overflow-hidden"
        style={{ background: 'linear-gradient(180deg, #020408 0%, #0d2438 40%, #123044 100%)' }}
      >
        <OceanDecor />
        <SpotlightGlow color="rgba(120,190,220,0.28)" />

        <div className="relative max-w-5xl mx-auto px-4 py-20">
          <p className="stamp text-sm mb-2" style={{ color: '#bcd6ea' }}>Browse the archive</p>
          <h2 className="font-display text-2xl md:text-3xl mb-8 max-w-lg" style={{ color: '#e8ecf1' }}>
            Find what your classmates already shared, or ask for what's missing.
          </h2>

          <div className="mb-12">
            <HomeSearch />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
            {SECTIONS.map((s) => {
              const Icon = s.icon
              const Motif = s.Motif
              const count = counts[s.countKey]
              return (
                <div
                  key={s.to}
                  className={`relative flex flex-col justify-between rounded-2xl p-6 border hover:border-white/25 transition-colors overflow-hidden ${s.span}`}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    borderColor: 'rgba(255,255,255,0.12)',
                    backdropFilter: 'blur(6px)',
                  }}
                >
                  {/* Stretched link: makes the whole card clickable without nesting a second <a> inside it */}
                  <Link to={s.to} className="absolute inset-0 rounded-2xl" aria-label={s.title} />

                  {/* Colored glow zone, tinted per section so the grid doesn't read as one flat color */}
                  <div
                    className="absolute -top-10 -right-10 w-40 h-40 rounded-full pointer-events-none"
                    style={{ background: s.accent, opacity: 0.18, filter: 'blur(40px)' }}
                  />
                  <Motif size={s.motifSize} color={s.accent} opacity={0.3} className="absolute -right-3 -bottom-3 pointer-events-none" />

                  <div className="relative pointer-events-none">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
                      style={{ background: `${s.accent}26`, border: `1px solid ${s.accent}59` }}
                    >
                      <Icon size={20} color={s.accent} strokeWidth={1.6} aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-xl mb-1" style={{ color: '#e8ecf1' }}>{s.title}</h3>
                    <p className="font-body text-sm" style={{ color: 'rgba(232,236,241,0.6)' }}>{s.desc}</p>
                  </div>

                  <div className="relative flex items-center justify-between mt-6 pointer-events-none gap-3">
                    {count !== undefined && (
                      <span className="font-body text-xs" style={{ color: 'rgba(232,236,241,0.45)' }}>
                        {count} {s.countLabel}
                      </span>
                    )}
                    {s.to === '/past-papers' && (
                      <Link
                        to="/requests"
                        className="pointer-events-auto font-body text-xs rounded-full px-3 py-1.5 whitespace-nowrap"
                        style={{ background: s.accent, color: '#0d2438' }}
                      >
                        + Request a missing file
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <ReefSilhouette color="#081826" className="absolute bottom-0 left-0 w-full h-14 md:h-20 pointer-events-none" />
      </div>
    </div>
  )
}
