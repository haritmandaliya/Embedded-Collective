import { useEffect, useState, useRef } from 'react'
import { motion, useMotionValue, useTransform, animate, useInView } from 'framer-motion'
import { MagneticButton } from './shared/MagneticButton'
import { useCommunity } from '../context/CommunityContext'

interface Stats {
  total_questions: number
  solved_questions: number
  member_count: number
  avg_rating: number
}

function Counter({ value, decimal = false }: { value: number; decimal?: boolean }) {
  const count = useMotionValue(0)
  const rounded = useTransform(count, (latest) =>
    decimal ? latest.toFixed(1) : Math.round(latest).toString()
  )
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-100px 0px' })

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, value, { duration: 1.5, ease: 'easeOut' })
      return controls.stop
    }
  }, [isInView, value])

  return <motion.span ref={ref}>{rounded}</motion.span>
}

export function CommunityGateway() {
  const { user } = useCommunity()
  const [stats, setStats] = useState<Stats>({
    total_questions: 23,
    solved_questions: 8,
    member_count: 12,
    avg_rating: 4.9,
  })

  const fetchStats = () => {
    fetch('/api/stats/public')
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error('Not OK')
      })
      .then((data) => {
        if (data) {
          setStats({
            total_questions: data.total_questions || 23,
            solved_questions: data.solved_questions || 8,
            member_count: data.member_count || 12,
            avg_rating: data.avg_rating || 4.9,
          })
        }
      })
      .catch(() => {
        // Fallback to mock values already set
      })
  }

  useEffect(() => {
    fetchStats()
    window.addEventListener('review-submitted', fetchStats)
    return () => {
      window.removeEventListener('review-submitted', fetchStats)
    }
  }, [])

  return (
    <section
      id="community"
      className="community-hero relative w-full py-24 overflow-hidden bg-[var(--bg-base)] border-y border-[var(--border-accent)]"
    >
      {/* Top Circuit Trace Border */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-core/30 to-transparent" />

      <div className="max-w-content mx-auto px-6 text-center relative z-10">
        <motion.span
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-mono text-xs uppercase tracking-[0.2em] text-red-core block mb-3"
        >
          // PLATFORM GATEWAY
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-heading font-bold text-3xl md:text-5xl uppercase tracking-[0.08em] mb-4 flex items-center justify-center gap-3 text-text-primary"
        >
          <span className="text-cyan-spark">⬡</span> EMBEDDED COLLECTIVE
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="font-body italic text-text-secondary max-w-xl mx-auto mb-12 text-base"
        >
          "Connect. Debug. Collaborate. Build Better Embedded Systems."
        </motion.p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
          {[
            { label: 'Questions Asked', value: stats.total_questions },
            { label: 'Problems Solved', value: stats.solved_questions, suffix: ' ✓' },
            { label: 'Active Members', value: stats.member_count },
            { label: 'Avg Rating', value: stats.avg_rating, decimal: true, suffix: ' ★' },
          ].map((item, idx) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 * idx }}
              className="stat-card p-4 rounded-lg flex flex-col items-center justify-center"
            >
              <span className="font-heading font-bold text-3xl md:text-4xl text-text-primary">
                <Counter value={item.value} decimal={item.decimal} />
                {item.suffix || ''}
              </span>
              <span className="font-mono text-[10px] text-text-secondary uppercase tracking-wider mt-1">
                {item.label}
              </span>
            </motion.div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-6">
          {user ? (
            <>
              <MagneticButton
                href="/community"
                className="font-heading font-bold text-sm border border-[var(--border-accent)] text-text-primary px-6 py-3 rounded glass-card hover:shadow-[var(--shadow-glow-c)] transition-all duration-300"
              >
                GO TO COMMUNITY <span className="ml-1 text-red-core">→</span>
              </MagneticButton>

              <MagneticButton
                href={`/community/u/${user.username}`}
                className="font-heading font-bold text-sm bg-[var(--accent-red)] text-white px-6 py-3 rounded hover:scale-105 glow-pulse-btn transition-all duration-300"
              >
                VIEW PROFILE <span className="ml-1">↗</span>
              </MagneticButton>
            </>
          ) : (
            <>
              <MagneticButton
                href="/community?tour=true"
                className="font-heading font-bold text-sm border border-[var(--border-accent)] text-text-primary px-6 py-3 rounded glass-card hover:shadow-[var(--shadow-glow-c)] transition-all duration-300"
              >
                TAKE A TOUR <span className="ml-1 text-red-core">→</span>
              </MagneticButton>

              <MagneticButton
                href="/community?join=true"
                className="font-heading font-bold text-sm bg-[var(--accent-red)] text-white px-6 py-3 rounded hover:scale-105 glow-pulse-btn transition-all duration-300"
              >
                JOIN THE PLATFORM <span className="ml-1">↗</span>
              </MagneticButton>
            </>
          )}
        </div>
      </div>

      {/* Bottom Circuit Trace Border */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-core/30 to-transparent" />
    </section>
  )
}
