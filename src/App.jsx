import { useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import BackgroundBlobs from './components/BackgroundBlobs'
import AgreementGate from './components/AgreementGate'
import Tutorial from './components/Tutorial'
import FeedbackButton from './components/FeedbackButton'
import Home from './pages/Home'
import Browse from './pages/Browse'
import LessonSlides from './pages/LessonSlides'
import Upload from './pages/Upload'
import Discussions from './pages/Discussions'
import StudyLinks from './pages/StudyLinks'
import Requests from './pages/Requests'
import Admin from './pages/Admin'

export default function App() {
  const [showTutorial, setShowTutorial] = useState(false)

  return (
    <AgreementGate onAgreed={() => setShowTutorial(true)}>
      <div className="min-h-screen font-body">
        <BackgroundBlobs />
        <Navbar />
        <Routes>
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
        <FeedbackButton />
        {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
      </div>
    </AgreementGate>
  )
}
