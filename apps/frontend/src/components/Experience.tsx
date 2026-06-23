import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { SectionTitle } from './shared/SectionTitle'
import { GlassCard } from './shared/GlassCard'
import {
  EXPERIENCE_META,
  EXPERIENCE_TASKS,
  EXPERIENCE_ACHIEVEMENTS,
  PROFICIENCY_BARS,
} from '../data/content'
import { useScrollReveal, revealVariantsLeft, revealVariants } from '../hooks/useScrollReveal'
import { useState } from 'react'

export function Experience() {
  const { ref, isVisible } = useScrollReveal()
  const [tasksVisible, setTasksVisible] = useState(false)

  return (
    <section id="experience" className="section-padding bg-deep min-h-screen">
      <div ref={ref} className="max-w-content mx-auto">
        <SectionTitle label="professional" title="EXPERIENCE.log" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <motion.div
            className="relative pl-8"
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={revealVariantsLeft}
          >
            <div className="absolute left-3 top-0 bottom-0 w-px bg-red-core/40 shadow-[0_0_8px_rgba(192,25,44,0.5)]" />
            <motion.div
              initial={{ scale: 0 }}
              animate={isVisible ? { scale: 1 } : {}}
              className="absolute left-0 top-6 w-6 h-6 rounded-full bg-red-core shadow-[0_0_15px_rgba(192,25,44,0.8)]"
            />

            <GlassCard className="p-8 ml-4">
              <span className="font-heading font-bold text-sm text-red-core border border-red-core/30 px-3 py-1 rounded">
                {EXPERIENCE_META.duration}
              </span>
              <h3 className="font-heading font-bold text-2xl uppercase mt-4">{EXPERIENCE_META.company}</h3>
              <p className="font-heading font-bold text-red-glow uppercase tracking-wider mb-4">
                {EXPERIENCE_META.role}
              </p>
              <p className="font-body font-bold text-text-secondary text-sm leading-[1.95] mb-6">
                Worked as a Software Engineering Intern at {EXPERIENCE_META.company} ({EXPERIENCE_META.location}). Contributing to enterprise application development using the Frappe Framework, React, Vite, and Python backend APIs.
              </p>

              <div
                className="font-mono text-xs bg-black/50 p-4 rounded border border-red-core/20 mb-6"
                onMouseEnter={() => setTasksVisible(true)}
              >
                {EXPERIENCE_TASKS.map((task, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={isVisible || tasksVisible ? { opacity: 1, x: 0 } : {}}
                    transition={{ delay: i * 0.12 }}
                    className="text-text-secondary mb-1"
                  >
                    [TASK {String(i + 1).padStart(2, '0')}] → {task}
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_ACHIEVEMENTS.map((a) => (
                  <span
                    key={a}
                    className="flex items-center gap-1 font-mono text-[11px] px-3 py-1.5 rounded glass-card"
                  >
                    <Check size={12} className="text-green-500" />
                    {a}
                  </span>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={revealVariants}
          >
            <h4 className="font-heading font-bold uppercase tracking-widest mb-6 text-text-secondary">
              Skill Proficiency
            </h4>
            <div className="space-y-4">
              {PROFICIENCY_BARS.map((bar, i) => (
                <div key={bar.label}>
                  <div className="flex justify-between font-mono text-xs mb-1">
                    <span>{bar.label}</span>
                    <span className="impact-text text-sm">{bar.value}%</span>
                  </div>
                  <div className="h-2 bg-black/50 rounded overflow-hidden">
                    <motion.div
                      className="h-full rounded"
                      style={{
                        backgroundColor: bar.type === 'embedded' ? '#C0192C' : '#00F5FF',
                      }}
                      initial={{ width: 0 }}
                      animate={isVisible ? { width: `${bar.value}%` } : {}}
                      transition={{ delay: i * 0.1, duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
