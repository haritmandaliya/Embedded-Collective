import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ChevronRight } from 'lucide-react'

interface FeaturedSolution {
  id: string
  title: string
  category: string
  rating: number
  review_excerpt?: string
  asker_name?: string
  slug?: string
}

export function SolvedShowcase() {
  const [solutions, setSolutions] = useState<FeaturedSolution[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/featured-solutions')
      .then((res) => {
        if (res.ok) return res.json()
        throw new Error('Not OK')
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setSolutions(data)
        }
      })
      .catch(() => {
        // Suppress and fallback to empty
      })
      .finally(() => {
        setLoading(false)
      })
  }, [])

  return (
    <section
      id="solutions"
      className="relative w-full py-24 bg-[--bg-void] overflow-hidden"
    >
      <div className="max-w-content mx-auto px-6 relative z-10">
        <motion.span
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="font-mono text-xs uppercase tracking-[0.2em] text-red-core block mb-3 text-center"
        >
          // PROVEN EXPERIENCE
        </motion.span>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="font-heading font-bold text-3xl md:text-5xl uppercase tracking-[0.08em] mb-12 text-center text-text-primary"
        >
          PROBLEMS I SOLVED
        </motion.h2>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="w-8 h-8 rounded-full border-2 border-red-core border-t-transparent animate-spin" />
          </div>
        ) : solutions.length > 0 ? (
          <div className="flex flex-col items-center gap-12 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
              {solutions.slice(0, 3).map((sol, idx) => (
                <motion.div
                  key={sol.id}
                  initial={{ opacity: 0, y: 25 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="glass-card p-6 rounded-lg flex flex-col justify-between h-72 border border-red-core/10 hover:border-red-core/30 hover:shadow-[0_0_20px_rgba(192,25,44,0.15)] transition-all duration-300 group"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-mono text-[10px] text-cyan-spark bg-cyan-dim/10 px-2 py-0.5 rounded border border-cyan-spark/20 uppercase">
                        {sol.category}
                      </span>
                    </div>

                    <h3 className="font-heading font-bold text-lg mb-3 text-text-primary group-hover:text-red-glow transition-colors duration-300 line-clamp-2">
                      {sol.title}
                    </h3>

                    {sol.review_excerpt && (
                      <p className="font-body text-xs text-text-secondary line-clamp-3 italic mb-4">
                        "{sol.review_excerpt}"
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-glass-border flex items-center justify-between">
                    <span className="font-mono text-[9px] text-text-secondary">
                      {sol.asker_name ? `@${sol.asker_name}` : 'Asker Verified'}
                    </span>
                    <Link
                      to={`/community/q/${sol.slug || sol.id}`}
                      className="font-mono text-[11px] text-red-core group-hover:text-red-glow flex items-center gap-1 transition-colors"
                    >
                      VIEW SOLUTION <ChevronRight size={12} />
                    </Link>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-4"
            >
              <Link
                to="/community"
                className="inline-flex items-center gap-2 font-heading font-bold text-xs uppercase tracking-wider border border-red-core/20 text-red-core hover:text-red-glow hover:border-red-core/40 px-8 py-3.5 rounded-lg transition-all duration-300 bg-red-core/5 hover:bg-red-core/10"
              >
                SHOW MORE SOLUTIONS
              </Link>
            </motion.div>
          </div>
        ) : (
          /* Graceful Fallback Card */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="max-w-2xl mx-auto glass-card p-10 rounded-[var(--radius-lg)] text-center border border-[var(--border-accent)] shadow-[var(--shadow-glow-r)]"
          >
            <motion.span
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="text-[var(--accent-red)] text-4xl block mb-4"
            >
              ⬡
            </motion.span>
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[var(--accent-green)] status-dot" />
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--accent-green)]">
                Actively Solving
              </span>
            </div>
            <h3 className="font-heading font-bold text-xl uppercase tracking-wider mb-3 text-text-primary">
              Debugging in the Community
            </h3>
            <p className="font-body text-sm text-text-secondary mb-6 leading-relaxed">
              I&apos;m debugging and resolving hardware challenges in the community right now. Full solutions with
              MCU code, logic analyzer traces, and schema logs will be featured here as they&apos;re published.
            </p>
            <Link
              to="/community?status=solved"
              className="inline-flex items-center gap-2 font-heading font-bold text-xs border border-[var(--border-accent)] text-[var(--accent-red)] px-6 py-3 rounded hover:shadow-[var(--shadow-glow-r)] transition-all duration-300"
            >
              Browse Solved Questions in Community →
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  )
}
