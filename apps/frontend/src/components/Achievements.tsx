import { useState, Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { SectionTitle } from './shared/SectionTitle'
import { ACHIEVEMENTS, CAREER_OBJECTIVE } from '../data/content'
import { useScrollReveal, revealVariants, revealVariantsLeft } from '../hooks/useScrollReveal'
import { TerminalText } from './shared/TerminalText'

const TorusScene = lazy(() =>
  import('../three/TorusScene').then((m) => ({ default: m.TorusScene }))
)

function CheckmarkDraw({ visible }: { visible: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <motion.path
        d="M5 12 L10 17 L19 7"
        stroke="#C0192C"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={visible ? { pathLength: 1 } : {}}
        transition={{ duration: 0.5 }}
      />
    </svg>
  )
}

export function Achievements() {
  const { ref, isVisible } = useScrollReveal()
  const [objectiveDone, setObjectiveDone] = useState(false)

  return (
    <section id="achievements" className="relative section-padding min-h-screen bg-void overflow-hidden">
      <Suspense fallback={null}>
        <TorusScene />
      </Suspense>

      <div ref={ref} className="relative z-10 max-w-content mx-auto">
        <SectionTitle label="milestones" title="ACHIEVEMENTS.log" />

        <div className="space-y-4 mb-20">
          {ACHIEVEMENTS.map((text, i) => (
            <motion.div
              key={i}
              initial="hidden"
              animate={isVisible ? 'visible' : 'hidden'}
              variants={i % 2 === 0 ? revealVariantsLeft : revealVariants}
              transition={{ delay: i * 0.1 }}
              className="group glass-card flex items-center gap-6 p-6 rounded-lg hover:border-red-core/60 transition-colors"
            >
              <span className="font-heading font-bold text-3xl text-red-core glow-pulse flex-shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <p className="font-body font-bold text-lg leading-[1.95] flex-1">{text}</p>
              <CheckmarkDraw visible={isVisible} />
            </motion.div>
          ))}
        </div>

        <div className="relative py-16 px-8 text-center rounded-lg overflow-hidden"
          style={{
            background:
              'linear-gradient(90deg, rgba(192,25,44,0.08), transparent, rgba(192,25,44,0.08))',
          }}
        >
          <span
            className="absolute top-0 left-1/2 -translate-x-1/2 font-heading font-bold text-[200px] text-red-core opacity-[0.08] leading-none pointer-events-none select-none"
            aria-hidden
          >
            "
          </span>
          <p className="relative font-body font-bold text-xl md:text-2xl italic text-text-primary max-w-3xl mx-auto leading-[2]">
            <TerminalText
              text={CAREER_OBJECTIVE}
              speed={12}
              onComplete={() => setObjectiveDone(true)}
            />
          </p>
          {objectiveDone && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              className="h-px bg-red-core max-w-3xl mx-auto mt-6 origin-left"
            />
          )}
        </div>
      </div>
    </section>
  )
}
