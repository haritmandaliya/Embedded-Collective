import { useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Code2,
  Cpu,
  Database,
  Terminal,
  Radio,
  Share2,
  Link,
  Network,
  Zap,
  Clock,
  Activity,
  HardDrive,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'
import { SectionTitle } from './shared/SectionTitle'
import { TRAINING_MODULES, LEARNING_OUTCOMES } from '../data/content'
import { useScrollReveal, getStaggerVariant } from '../hooks/useScrollReveal'
import { useScrubVideo, TRAINING_KEY_STEP } from '../hooks/useScrubVideo'

const MODULE_ICONS: Record<string, LucideIcon> = {
  Code2,
  Cpu,
  Database,
  Terminal,
  Radio,
  Share2,
  Link,
  Network,
  Zap,
  Clock,
  Activity,
  HardDrive,
}

export function Training() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [contentParallax, setContentParallax] = useState({ x: 0, y: 0 })
  const { ref, isVisible } = useScrollReveal()

  const [competencyPage, setCompetencyPage] = useState(0)
  const [direction, setDirection] = useState<'next' | 'prev'>('next')
  const CARDS_PER_PAGE = 3
  const pages = Math.ceil(LEARNING_OUTCOMES.length / CARDS_PER_PAGE)
  const visibleCards = LEARNING_OUTCOMES.slice(
    competencyPage * CARDS_PER_PAGE,
    competencyPage * CARDS_PER_PAGE + CARDS_PER_PAGE
  )

  const handleNext = () => {
    if (competencyPage < pages - 1) {
      setDirection('next')
      setCompetencyPage((prev) => prev + 1)
    }
  }

  const handlePrev = () => {
    if (competencyPage > 0) {
      setDirection('prev')
      setCompetencyPage((prev) => prev - 1)
    }
  }

  useEffect(() => {
    if (!isVisible) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handlePrev()
      } else if (e.key === 'ArrowRight') {
        handleNext()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isVisible, competencyPage, pages])

  useScrubVideo(sectionRef, {
    canvasRef,
    framesPath: '/videos/frames/training',
    pixelsToFrames: 0.11,
    momentumDecay: 10,
    keyStep: TRAINING_KEY_STEP,
  })

  const handleContentMove = (e: React.MouseEvent) => {
    const rect = contentRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 6
    const y = ((e.clientY - rect.top) / rect.height - 0.5) * 6
    setContentParallax({ x, y })
  }

  return (
    <section
      id="training"
      ref={sectionRef}
      className="scrub-section relative section-padding min-h-screen overflow-hidden outline-none focus:outline-none"
    >
      <div className="skills-video-bg scrub-video-stage absolute inset-0 z-0" aria-hidden>
        <canvas ref={canvasRef} className="scrub-canvas" />
        <div className="scrub-video-overlay pointer-events-none" />
      </div>

      <div
        ref={contentRef}
        onMouseMove={handleContentMove}
        onMouseLeave={() => setContentParallax({ x: 0, y: 0 })}
        style={{ transform: `translate(${contentParallax.x}px, ${contentParallax.y}px)` }}
        className="relative z-10 max-w-content mx-auto text-center transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] pointer-events-none"
      >
        <div ref={ref} className="pointer-events-auto">
          <SectionTitle title="VECTOR_INDIA.training" className="text-center [&_svg]:mx-auto" />

          <h3 className="font-heading font-bold text-2xl md:text-4xl uppercase tracking-[0.06em] mb-2">
            VECTOR INDIA, BENGALURU
          </h3>
          <div className="w-48 h-px bg-red-core mx-auto mb-6" />

          <span className="inline-flex items-center gap-2 font-heading font-bold text-xs px-4 py-2 rounded-full glass-card border border-red-core/30 mb-12">
            <span className="w-2 h-2 rounded-full bg-green-500 status-dot" />
            <span className="text-red-glow uppercase">Currently Pursuing</span>
          </span>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-12">
            {TRAINING_MODULES.map((mod, i) => {
              const Icon = MODULE_ICONS[mod.icon]
              return (
                <motion.div
                  key={mod.name}
                  initial="hidden"
                  animate={isVisible ? 'visible' : 'hidden'}
                  variants={getStaggerVariant(i, 4)}
                  transition={{ delay: i * 0.05 }}
                  className="glass-card p-4 rounded-lg hover:shadow-[0_0_20px_rgba(192,25,44,0.3)] hover:border-red-core/70 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group cursor-default"
                >
                  {Icon && (
                    <Icon
                      size={20}
                      className="text-red-core mx-auto mb-2 group-hover:rotate-12 transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
                    />
                  )}
                  <p className="font-mono text-[11px] text-text-primary">{mod.name}</p>
                </motion.div>
              )
            })}
          </div>

          <div className="relative flex items-center justify-between gap-4 mt-8 max-w-4xl mx-auto pointer-events-auto">
            {/* Prev Button */}
            <button
              onClick={handlePrev}
              disabled={competencyPage === 0}
              aria-label="Previous page"
              className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border border-red-core/30 bg-glass-bg transition-all duration-300 ${
                competencyPage === 0
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:shadow-[0_0_12px_rgba(192,25,44,0.5)] hover:border-red-core/60'
              }`}
            >
              <ChevronLeft size={20} className="text-red-core" />
            </button>

            {/* Carousel Container */}
            <div className="flex-1 overflow-x-auto md:overflow-x-hidden py-4 px-2 scrollbar-none">
              <AnimatePresence initial={false} mode="wait">
                <motion.div
                  key={competencyPage}
                  custom={direction}
                  initial={{ x: direction === 'next' ? 60 : -60, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: direction === 'next' ? -60 : 60, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 28 }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
                >
                  {visibleCards.map((outcome, idx) => {
                    return (
                      <div
                        key={outcome.title}
                        className="glass-card p-4 rounded-lg flex flex-col justify-between h-28"
                      >
                        <p className="font-mono text-xs mb-3 text-left text-text-primary">{outcome.title}</p>
                        <div>
                          <div className="h-1.5 bg-black/50 rounded overflow-hidden">
                            <motion.div
                              className="h-full bg-red-core rounded"
                              initial={{ width: 0 }}
                              animate={isVisible ? { width: `${outcome.progress}%` } : {}}
                              transition={{ delay: 0.1 + idx * 0.1, duration: 0.8 }}
                            />
                          </div>
                          <p className="font-mono text-[9px] text-right mt-1 text-text-secondary">{outcome.progress}%</p>
                        </div>
                      </div>
                    )
                  })}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Next Button */}
            <button
              onClick={handleNext}
              disabled={competencyPage === pages - 1}
              aria-label="Next page"
              className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center border border-red-core/30 bg-glass-bg transition-all duration-300 ${
                competencyPage === pages - 1
                  ? 'opacity-30 cursor-not-allowed'
                  : 'hover:shadow-[0_0_12px_rgba(192,25,44,0.5)] hover:border-red-core/60'
              }`}
            >
              <ChevronRight size={20} className="text-red-core" />
            </button>
          </div>

          {/* Dot Indicators */}
          <div className="flex justify-center items-center gap-2 mt-4 pointer-events-auto">
            {Array.from({ length: pages }).map((_, pageIdx) => (
              <button
                key={pageIdx}
                onClick={() => {
                  setDirection(pageIdx > competencyPage ? 'next' : 'prev')
                  setCompetencyPage(pageIdx)
                }}
                className="focus:outline-none"
                aria-label={`Go to page ${pageIdx + 1}`}
              >
                <motion.div
                  animate={{
                    width: pageIdx === competencyPage ? 20 : 6,
                    backgroundColor: pageIdx === competencyPage ? '#C0192C' : 'rgba(192,25,44,0.3)',
                  }}
                  transition={{ duration: 0.3 }}
                  className="h-1.5 rounded-full"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
