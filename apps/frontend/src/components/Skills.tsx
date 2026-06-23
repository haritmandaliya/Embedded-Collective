import { useRef } from 'react'
import { motion } from 'framer-motion'
import { SectionTitle } from './shared/SectionTitle'
import { GlassCard } from './shared/GlassCard'
import { SKILL_CATEGORIES } from '../data/content'
import { useScrollReveal, getStaggerVariant } from '../hooks/useScrollReveal'
import { useScrubVideo, SKILLS_KEY_STEP } from '../hooks/useScrubVideo'

function WaveformIcon() {
  return (
    <svg width="40" height="16" viewBox="0 0 40 16" className="inline-block ml-2">
      <path
        d="M0,8 L5,4 L10,12 L15,6 L20,10 L25,4 L30,12 L35,6 L40,8"
        stroke="#00F5FF"
        strokeWidth="1"
        fill="none"
        opacity="0.6"
      />
    </svg>
  )
}

export function Skills() {
  const sectionRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { ref, isVisible } = useScrollReveal()

  useScrubVideo(sectionRef, {
    canvasRef,
    framesPath: '/videos/frames/skills',
    pixelsToFrames: 0.1,
    momentumDecay: 5,
    keyStep: SKILLS_KEY_STEP,
  })

  return (
    <section
      id="skills"
      ref={sectionRef}
      className="scrub-section relative section-padding min-h-screen bg-void overflow-hidden outline-none focus:outline-none"
    >
      <div className="skills-video-bg scrub-video-stage" aria-hidden>
        <canvas ref={canvasRef} className="scrub-canvas" />
      </div>

      <div ref={ref} className="relative z-10 max-w-content mx-auto pointer-events-none">
        <div className="pointer-events-auto">
          <SectionTitle label="technical" title="SKILLS.sys" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {SKILL_CATEGORIES.map((cat, i) => (
              <motion.div
                key={cat.title}
                initial="hidden"
                animate={isVisible ? 'visible' : 'hidden'}
                variants={getStaggerVariant(i, 3)}
                transition={{ delay: i * 0.1 }}
              >
                <GlassCard className="p-6 group" tiltIntensity={8}>
                  <h3 className="font-heading font-bold text-lg uppercase tracking-wide mb-4 text-red-glow flex items-center">
                    {cat.title}
                    {'hasWaveform' in cat && cat.hasWaveform && <WaveformIcon />}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {cat.skills.map((skill) => (
                      <span
                        key={skill}
                        className="font-mono text-xs px-2 py-1 rounded border border-red-core/20 hover:bg-red-core hover:text-white transition-all duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] cursor-default"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
