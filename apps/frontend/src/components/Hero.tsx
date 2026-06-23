import { useState, useEffect, useRef, Suspense, lazy } from 'react'
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion'
import { VolumeX, Volume2 } from 'lucide-react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { TerminalText } from './shared/TerminalText'
import { MagneticButton } from './shared/MagneticButton'
import { HERO_CHIPS } from '../data/content'
import { useReducedMotion as useReducedMotionHook } from '../hooks/useReducedMotion'

const ChipScene = lazy(() =>
  import('../three/ChipScene').then((m) => ({ default: m.ChipScene }))
)

gsap.registerPlugin(ScrollTrigger)

function AnimatedName({
  word,
  className,
  glow,
}: {
  word: string
  className: string
  glow?: boolean
}) {
  const reduced = useReducedMotion()
  return (
    <span className={`block ${glow ? 'glow-pulse' : ''} ${className}`}>
      {word.split('').map((letter, i) => (
        <motion.span
          key={i}
          initial={reduced ? {} : { scale: 0.3, opacity: 0, y: 60 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{
            delay: 0.8 + i * 0.04,
            ease: [0.22, 1, 0.36, 1],
            duration: 0.5,
          }}
          className="inline-block"
        >
          {letter}
        </motion.span>
      ))}
    </span>
  )
}

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const ambientRef = useRef<HTMLAudioElement | null>(null)
  const overlayRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [scrollLocked, setScrollLocked] = useState(true)
  const [loadingText, setLoadingText] = useState('')
  const [showScrollIndicator, setShowScrollIndicator] = useState(false)
  const [subtitleDone, setSubtitleDone] = useState(false)
  const [showButtons, setShowButtons] = useState(false)

  // Unified sound state: true = unmuted, false = muted
  const [soundOn, setSoundOn] = useState(false)
  const userMutedRef = useRef(false)
  const [heroVisible, setHeroVisible] = useState(true)
  const [ambientReady, setAmbientReady] = useState(false)

  const reduced = useReducedMotionHook()
  const lockDuration = reduced ? 300 : 1500

  // Initialize ambient audio
  useEffect(() => {
    const audio = new Audio('/audio/ambient_lab.mp3')
    audio.loop = true
    audio.volume = 0.12
    audio.oncanplaythrough = () => setAmbientReady(true)
    audio.onloadeddata = () => setAmbientReady(true)
    audio.onerror = () => setAmbientReady(true)
    ambientRef.current = audio
    return () => {
      audio.pause()
      audio.src = ''
    }
  }, [])

  // Unified toggle: controls both video muted state AND ambient audio
  const toggleSound = () => {
    const video = videoRef.current
    const ambient = ambientRef.current
    if (!video) return

    if (soundOn) {
      // MUTE: mute video, pause ambient
      video.muted = true
      ambient?.pause()
      userMutedRef.current = true
      setSoundOn(false)
    } else {
      // UNMUTE: unmute video, play ambient from same logical point
      video.muted = false
      video.play().catch(() => { video.muted = true })
      if (ambient && ambientReady) {
        ambient.play().catch(() => { })
      }
      userMutedRef.current = false
      setSoundOn(true)
    }
  }

  // Loading sequence
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const loadingMsg = 'LOADING SEQUENCE...'
    let charIdx = 0
    const charInterval = setInterval(() => {
      charIdx++
      setLoadingText(loadingMsg.slice(0, charIdx))
      if (charIdx >= loadingMsg.length) clearInterval(charInterval)
    }, 40)

    const unlockTimer = setTimeout(() => {
      document.body.style.overflow = ''
      setScrollLocked(false)
      setShowScrollIndicator(true)
    }, lockDuration)

    const buttonsTimer = setTimeout(() => setShowButtons(true), reduced ? 500 : 2000)

    return () => {
      clearInterval(charInterval)
      clearTimeout(unlockTimer)
      clearTimeout(buttonsTimer)
      document.body.style.overflow = ''
    }
  }, [lockDuration, reduced])

  // Auto-play video immediately on mount (guarantees smooth loading and no pauses)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = true
    video.play().catch(() => { })
  }, [])

  // Auto-start ambient when ready (if not user-muted and not scroll-locked)
  useEffect(() => {
    if (!ambientReady || scrollLocked || userMutedRef.current || reduced) return
    const a = ambientRef.current
    if (!a) return
    a.play()
      .then(() => {
        setSoundOn(true)
        if (videoRef.current) {
          videoRef.current.muted = false
        }
      })
      .catch(() => { })
  }, [ambientReady, scrollLocked, reduced])

  // IntersectionObserver for hero visibility
  useEffect(() => {
    const section = sectionRef.current
    if (!section) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const visible = entry.intersectionRatio >= 0.1
        setHeroVisible(visible)
        // When leaving hero: MUTE video + pause ambient (don't pause video)
        if (!visible) {
          if (videoRef.current) videoRef.current.muted = true
          ambientRef.current?.pause()
          setSoundOn(false)
        } else if (!userMutedRef.current && ambientReady) {
          // Returning to hero: restore if user hasn't muted
          if (videoRef.current) {
            videoRef.current.muted = false
            videoRef.current.play().catch(() => { })
          }
          ambientRef.current?.play().catch(() => { })
          setSoundOn(true)
        }
      },
      { threshold: [0, 0.1] }
    )
    observer.observe(section)

    return () => observer.disconnect()
  }, [ambientReady])

  // Visibility change handler
  useEffect(() => {
    const handler = () => {
      if (document.hidden) {
        ambientRef.current?.pause()
      } else if (soundOn && heroVisible) {
        ambientRef.current?.play().catch(() => { })
      }
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [soundOn, heroVisible])

  // GSAP scroll parallax + scroll-based mute (NOT pause)
  useEffect(() => {
    if (reduced || !sectionRef.current) return

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top top',
        end: '+=150%',
        pin: true,
        scrub: 1.5,
        onUpdate: (self) => {
          const progress = self.progress
          if (overlayRef.current) {
            overlayRef.current.style.opacity = String(0.15 + progress * 0.8)
          }
          if (contentRef.current) {
            contentRef.current.style.transform = `translateY(${-progress * 150}px)`
          }
          if (videoRef.current) {
            videoRef.current.style.transform = `scale(${1 + progress * 0.08})`
          }
          // Scroll-based audio mute: MUTE on scroll, never pause video
          if (progress > 0.05) {
            if (videoRef.current) videoRef.current.muted = true
            ambientRef.current?.pause()
            setSoundOn(false)
          } else if (!userMutedRef.current) {
            if (videoRef.current) {
              videoRef.current.muted = false
              videoRef.current.play().catch(() => { })
            }
            ambientRef.current?.play().catch(() => { })
            setSoundOn(true)
          }
        },
      })
    }, sectionRef)

    return () => ctx.revert()
  }, [reduced])

  // Scroll-based mute fallback for non-gsap
  useEffect(() => {
    const onScroll = () => {
      if (window.scrollY > 60) {
        if (videoRef.current) videoRef.current.muted = true
        ambientRef.current?.pause()
        setSoundOn(false)
      } else if (!userMutedRef.current && heroVisible && ambientReady) {
        if (videoRef.current) {
          videoRef.current.muted = false
          videoRef.current.play().catch(() => { })
        }
        ambientRef.current?.play().catch(() => { })
        setSoundOn(true)
      }
      if (window.scrollY > 50) setShowScrollIndicator(false)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [heroVisible, ambientReady])

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="hero-section relative w-full overflow-hidden"
    >
      <div className="hero-video-wrap absolute inset-0 z-[1]">
        <video
          ref={videoRef}
          src="/videos/New_hero_intro.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/videos/hero_poster.jpg"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out"
          style={{ objectPosition: 'center top' }}
        />
        <div
          ref={overlayRef}
          className="absolute inset-0"
          style={{
            background: `
              linear-gradient(to bottom, rgba(0,0,0,0.15), rgba(0,0,0,0.6)),
              radial-gradient(ellipse at center, transparent 50%, rgba(192,25,44,0.4) 100%)
            `,
            opacity: 0.15,
          }}
          aria-hidden="true"
        />
      </div>

      <div className="hero-left-scrim" aria-hidden />

      {scrollLocked && (
        <motion.p
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: 1.3, duration: 0.2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 font-mono text-xs text-red-core tracking-widest"
        >
          {loadingText}
          <span className="blink">█</span>
        </motion.p>
      )}

      {/* Unified Sound Toggle Button */}
      <AnimatePresence>
        {ambientReady && !reduced && (
          <motion.button
            key="sound-toggle-btn"
            type="button"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            onClick={toggleSound}
            aria-label={soundOn ? 'Mute all audio' : 'Unmute all audio'}
            className={`absolute bottom-6 right-6 z-20 flex items-center justify-center w-9 h-9 rounded-full backdrop-blur-md border transition-all duration-300 select-none ${soundOn
              ? 'bg-[--red-core]/20 border-[--red-core]/50 text-[--text-primary] shadow-[0_0_16px_rgba(192,25,44,0.35)]'
              : 'bg-black/50 border-white/15 text-[--text-secondary] hover:border-[--red-core]/40'
              }`}
          >
            {soundOn ? <Volume2 size={15} className="text-[--red-core]" /> : <VolumeX size={15} />}
          </motion.button>
        )}
      </AnimatePresence>

      <div
        ref={contentRef}
        className="hero-content relative z-10 h-full max-w-content flex items-center"
      >
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 w-full items-center relative min-h-[60vh]">
          <div className="lg:col-span-3 relative">
            <div className="relative z-10 py-8 pr-4">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="hero-badge inline-flex items-center gap-1 border border-red-core text-red-core font-mono text-[11px] uppercase px-3 py-1 rounded-full mb-6"
              >
                Embedded Systems Developer
                <span className="blink">|</span>
              </motion.div>

              <h1 className="font-heading font-bold text-4xl md:text-6xl lg:text-7xl uppercase leading-tight mb-6">
                <AnimatedName word="HARIT" className="hero-name-harit text-white" />
                <AnimatedName word="MANDALIYA" className="hero-name-mandaliya text-red-core" glow />
              </h1>

              <p className="hero-subtitle font-body font-bold text-lg md:text-xl mb-8 max-w-xl">
                <TerminalText
                  text="Graduated In Computer Engineering currently pursuing Embedded System Training At Vector India."
                  speed={18}
                  onComplete={() => setSubtitleDone(true)}
                />
              </p>

              {subtitleDone && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-2 overflow-x-auto pb-2 mb-8 scrollbar-hide"
                >
                  {HERO_CHIPS.map((chip, i) => (
                    <motion.span
                      key={chip}
                      initial={{ x: i % 2 === 0 ? -20 : 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      transition={{ delay: i * 0.08, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                      className="hero-chip flex-shrink-0 font-mono text-xs px-3 py-1.5 rounded hover:border-cyan-spark hover:-translate-y-0.5 hover:shadow-[0_0_12px_rgba(0,245,255,0.4)] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-default"
                    >
                      {chip}
                    </motion.span>
                  ))}
                </motion.div>
              )}

              {showButtons && (
                <motion.div
                  initial={{ opacity: 0, x: -30 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  className="flex flex-wrap gap-4"
                >
                  <MagneticButton
                    href="#projects"
                    className="hero-btn-primary ripple font-heading font-bold text-sm bg-red-core text-white px-6 py-3 rounded hover:scale-105 hover:shadow-[0_0_20px_rgba(192,25,44,0.6)] transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  >
                    VIEW PROJECTS
                  </MagneticButton>
                  <MagneticButton
                    href="/resume/Harit_Resume.pdf"
                    download
                    className="hero-btn-secondary ripple font-heading font-bold text-sm border border-red-core text-white px-6 py-3 rounded glass-card hover:bg-red-dim/30 hover:shadow-[0_0_15px_rgba(192,25,44,0.4)] transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                  >
                    DOWNLOAD RESUME
                  </MagneticButton>
                  <MagneticButton
                    href="#contact"
                    className="ripple font-heading font-bold text-sm text-white px-4 py-3 relative group transition-all duration-300"
                  >
                    CONTACT ME
                    <span className="absolute bottom-2 left-4 right-4 h-px bg-red-core scale-x-0 group-hover:scale-x-100 transition-transform duration-400 origin-left ease-[cubic-bezier(0.22,1,0.36,1)]" />
                  </MagneticButton>
                </motion.div>
              )}
            </div>
          </div>

          <div className="hidden lg:block lg:col-span-2">
            <Suspense
              fallback={
                <div className="h-[400px] w-full rounded-lg bg-gradient-to-br from-red-dim/20 to-transparent" />
              }
            >
              <ChipScene />
            </Suspense>
          </div>
        </div>
      </div>

      {showScrollIndicator && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2"
        >
          <span className="font-mono text-[10px] tracking-[0.3em] text-text-secondary">
            SCROLL TO EXPLORE
          </span>
          <svg width="20" height="40" viewBox="0 0 20 40" className="text-red-core">
            <motion.line
              x1="10"
              y1="0"
              x2="10"
              y2="25"
              stroke="currentColor"
              strokeWidth="1"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
            <motion.path
              d="M10,25 L10,30 L18,30"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 1, delay: 1, repeat: Infinity }}
            />
          </svg>
        </motion.div>
      )}
    </section>
  )
}
