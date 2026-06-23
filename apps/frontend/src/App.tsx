import { useEffect, Suspense, lazy } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { PageTransition } from './components/PageTransition'
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { Navbar } from './components/Navbar'
import { Hero } from './components/Hero'
import { Footer } from './components/Footer'
import { GlowCursor } from './components/shared/GlowCursor'
import { ThemeProvider } from './context/ThemeContext'
import { ToastProvider } from './context/ToastContext'

const About = lazy(() => import('./components/About').then((m) => ({ default: m.About })))
const Skills = lazy(() => import('./components/Skills').then((m) => ({ default: m.Skills })))
const Experience = lazy(() =>
  import('./components/Experience').then((m) => ({ default: m.Experience }))
)
const Education = lazy(() =>
  import('./components/Education').then((m) => ({ default: m.Education }))
)
const Training = lazy(() =>
  import('./components/Training').then((m) => ({ default: m.Training }))
)
const Projects = lazy(() =>
  import('./components/Projects').then((m) => ({ default: m.Projects }))
)
const SolvedShowcase = lazy(() =>
  import('./components/SolvedShowcase').then((m) => ({ default: m.SolvedShowcase }))
)
const Reviews = lazy(() =>
  import('./components/Reviews').then((m) => ({ default: m.Reviews }))
)
const Achievements = lazy(() =>
  import('./components/Achievements').then((m) => ({ default: m.Achievements }))
)
const CommunityGateway = lazy(() =>
  import('./components/CommunityGateway').then((m) => ({ default: m.CommunityGateway }))
)
const Contact = lazy(() => import('./components/Contact').then((m) => ({ default: m.Contact })))
const Contributor = lazy(() =>
  import('./components/Contributor').then((m) => ({ default: m.Contributor }))
)
const CommunityApp = lazy(() =>
  import('./components/community/CommunityApp').then((m) => ({ default: m.CommunityApp }))
)

gsap.registerPlugin(ScrollTrigger)

import { CommunityProvider, useCommunity } from './context/CommunityContext'
import { AuthModal } from './components/community/AuthModal'

function SectionFallback() {
  return <div className="min-h-screen bg-void" />
}

function Portfolio() {
  return (
    <>
      <Hero />
      <Suspense fallback={<SectionFallback />}>
        <About />
        <Skills />
        <Experience />
        <Education />
        <Training />
        <Projects />
        <SolvedShowcase />
        <Reviews />
        <Achievements />
        <CommunityGateway />
        <Contact />
        <Contributor />
      </Suspense>
    </>
  )
}

function AppContent() {
  const location = useLocation()
  const { authModalOpen, authModalTab, setAuthModalOpen } = useCommunity()

  return (
    <>
      <div className="ambient-glow" aria-hidden />
      <div className="noise-overlay" aria-hidden />
      <GlowCursor />
      <Navbar />
      <main>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={
              <PageTransition>
                <Portfolio />
              </PageTransition>
            } />
            <Route path="/community/*" element={
              <PageTransition>
                <Suspense fallback={<SectionFallback />}>
                  <CommunityApp />
                </Suspense>
              </PageTransition>
            } />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialTab={authModalTab}
      />
    </>
  )
}

function App() {
  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    })

    lenis.on('scroll', ScrollTrigger.update)

    const raf = (time: number) => {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
    }
  }, [])

  return (
    <ThemeProvider>
      <CommunityProvider>
        <ToastProvider>
          <AppContent />
        </ToastProvider>
      </CommunityProvider>
    </ThemeProvider>
  )
}

export default App

