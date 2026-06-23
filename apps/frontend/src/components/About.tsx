import { motion } from 'framer-motion'
import {
  Code,
  Brain,
  Cpu,
  Layers,
  BookOpen,
  Bug,
  MapPin,
  Music,
  Camera,
  Wrench,
  Languages,
  type LucideIcon,
} from 'lucide-react'
import { SectionTitle } from './shared/SectionTitle'
import { CircuitTrace } from './shared/CircuitTrace'
import { TerminalText } from './shared/TerminalText'
import { PERSONAL_INFO, STRENGTHS, BEYOND_ENGINEERING } from '../data/content'
import { useScrollReveal, revealVariantsLeft, revealVariants } from '../hooks/useScrollReveal'

const ICON_MAP: Record<string, LucideIcon> = {
  Code,
  Brain,
  Cpu,
  Layers,
  BookOpen,
  Bug,
  Music,
  Camera,
  Wrench,
  Languages,
}

export function About() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <section
      id="about"
      className="relative section-padding bg-deep min-h-screen"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30 L30 30 L30 0' fill='none' stroke='rgba(192,25,44,0.06)' stroke-width='1'/%3E%3C/svg%3E")`,
      }}
    >
      <div ref={ref} className="max-w-content mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          <motion.div
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={revealVariantsLeft}
          >
            <div className="terminal-card">
              <div className="terminal-dots">
                <span className="terminal-dot terminal-dot-red" />
                <span className="terminal-dot terminal-dot-dim" />
                <span className="terminal-dot terminal-dot-cyan" />
              </div>
              <div className="p-6 font-mono text-sm leading-relaxed whitespace-pre">
                <TerminalText
                  text={`/**\n * @file   about_me.c\n * @author Harit Mandaliya\n * @brief  Embedded Systems Developer\n * @loc    Bengaluru, India\n */`}
                  speed={20}
                />
              </div>
            </div>
            <div className="flex items-center gap-2 mt-4 font-mono text-sm text-text-secondary">
              <MapPin size={16} className="text-red-core blink" />
              BENGALURU, INDIA
            </div>
          </motion.div>

          <motion.div
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={revealVariants}
          >
            <SectionTitle title="ABOUT_ME.c" />
            <p className="font-body font-bold text-[17px] leading-[1.95] tracking-[0.01em] text-text-secondary mb-8">
              Hello, I am Harit Mandaliya, a Computer Engineering graduate passionate about
              Embedded Systems, Firmware Development, and low-level software engineering. My
              journey into technology began with software development and gradually evolved
              toward embedded engineering, where I discovered my interest in understanding how
              hardware and software interact to create intelligent systems.
            </p>
            <p className="font-body font-bold text-[17px] leading-[1.95] tracking-[0.01em] text-text-secondary mb-8">
              Currently pursuing advanced Embedded Systems training at Vector India, Bengaluru.
              My goal is to contribute to innovative products in Embedded Systems, Automotive
              Electronics, Industrial Automation, and IoT domains.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {PERSONAL_INFO.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial="hidden"
                  animate={isVisible ? 'visible' : 'hidden'}
                  variants={i % 2 === 0 ? revealVariantsLeft : revealVariants}
                  transition={{ delay: i * 0.1 }}
                  className="info-card glass-card rounded"
                >
                  <p className="font-mono text-[11px] text-red-core mb-1">{item.label}</p>
                  <p className="text-[15px] text-text-primary">{item.value}</p>
                </motion.div>
              ))}
            </div>

            <p className="font-heading font-bold uppercase tracking-widest text-sm mb-4">
              Professional Strengths
            </p>
            <div className="flex flex-wrap gap-2 mb-8">
              {STRENGTHS.map((s) => {
                const Icon = ICON_MAP[s.icon]
                return (
                  <span
                    key={s.text}
                    className="strength-badge flex items-center gap-2 font-mono text-xs px-3 py-2 rounded border border-red-core/30 hover:border-cyan-spark transition-colors cursor-default"
                  >
                    {Icon && <Icon size={14} className="text-red-core transition-all" />}
                    {s.text}
                  </span>
                )
              })}
            </div>

            <p className="font-heading font-bold uppercase tracking-widest text-sm mb-4">
              Beyond Engineering
            </p>
            <div className="flex flex-wrap gap-2">
              {BEYOND_ENGINEERING.map((s) => {
                const Icon = ICON_MAP[s.icon]
                return (
                  <span
                    key={s.text}
                    className="strength-badge flex items-center gap-2 font-mono text-xs px-3 py-2 rounded border border-red-core/30 hover:border-cyan-spark transition-colors cursor-default"
                  >
                    {Icon && <Icon size={14} className="text-red-core transition-all" />}
                    {s.text}
                  </span>
                )
              })}
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-content mx-auto mt-16">
        <CircuitTrace
          path="M 0 20 L 400 20 L 400 20 L 800 20 L 800 40 L 1200 40"
          horizontal
          ambientLoop
        />
      </div>
    </section>
  )
}
