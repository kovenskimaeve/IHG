import { useState } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import SeaDrift from './components/SeaDrift'
import AgreementGate from './components/AgreementGate'
import Tutorial from './components/Tutorial'
import FeedbackButton from './components/FeedbackButton'
import ErrorBoundary from './components/ErrorBoundary'
import MaintenanceScreen from './components/MaintenanceScreen'
import AccessGate from './components/AccessGate'
import Home from './pages/Home'
import Browse from './pages/Browse'
import LessonSlides from './pages/LessonSlides'
import Upload from './pages/Upload'
import Discussions from './pages/Discussions'
import StudyLinks from './pages/StudyLinks'
import Requests from './pages/Requests'
import Admin from './pages/Admin'

const MAINTENANCE_MODE = import.meta.env.VITE_MAINTENANCE_MODE === 'true'
// App-level gate for the testing phase — set VITE_ACCESS_CODE in Vercel to a
// shared code and give it to your 10 testers; leave it unset/empty to turn
// this off entirely. This keeps casual/random visitors out, but it's a
// front-end gate, not a server-side one: the Supabase URL and anon key are
// still visible in the public JS bundle (true of any Vite app), so it isn't
// meant to stop a determined, technical person — just to keep the link from
// being casually shared or stumbled into during testing.
const ACCESS_CODE = import.meta.env.VITE_ACCESS_CODE || ''

function PageCrashed() {
  return (
    <div className="max-w-md mx-auto px-4 py-24 text-center">
      <p className="font-display text-2xl mb-3">Something broke.</p>
      <p className="font-body text-sm text-inkSoft mb-5">
        This page hit an error. Try reloading — if it keeps happening, use the
        feedback button to let an admin know.
      </p>
      <button onClick={() => window.location.reload()} className="bg-library text-parchment font-body text-sm px-5 py-2 shadow-card">
        Reload
      </button>
    </div>
  )
}

export default function App() {
  const [showTutorial, setShowTutorial] = useState(false)
  const location = useLocation()

  // Maintenance mode blocks every route except /admin, so an admin can still
  // log in to investigate or clean up while the site is down for everyone
  // else. Toggle with the VITE_MAINTENANCE_MODE env var in Vercel, then
  // redeploy (Vite env vars are baked in at build time, so this isn't
  // instant — see CHANGES.md for the faster, no-redeploy emergency option).
  if (MAINTENANCE_MODE && location.pathname !== '/admin') {
    return <MaintenanceScreen />
  }

  const isAdminRoute = location.pathname === '/admin'

  return (
    <AccessGate code={isAdminRoute ? '' : ACCESS_CODE}>
      <AgreementGate onAgreed={() => setShowTutorial(true)}>
        <div className="min-h-screen font-body">
          <Navbar />
          {location.pathname !== '/' && <SeaDrift />}
          <ErrorBoundary key={location.pathname} fallback={<PageCrashed />}>
            <div key={location.pathname} className="page-enter">
              <Routes location={location}>
                <Route path="/" element={<Home />} />
                <Route path="/past-papers" element={<Browse category="past_paper" />} />
                <Route path="/lesson-slides" element={<LessonSlides />} />
                <Route path="/study-guides" element={<Browse category="study_guide" />} />
                <Route path="/discussions" element={<Discussions />} />
                <Route path="/study-links" element={<StudyLinks />} />
                <Route path="/requests" element={<Requests />} />
                <Route path="/upload" element={<Upload />} />
                <Route path="/admin" element={<Admin />} />
              </Routes>
            </div>
          </ErrorBoundary>
          <FeedbackButton />
          {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
        </div>
      </AgreementGate>
    </AccessGate>
  )
}
