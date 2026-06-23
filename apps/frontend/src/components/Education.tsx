import { motion } from 'framer-motion'
import { GraduationCap, MapPin, Calendar, Award } from 'lucide-react'
import { SectionTitle } from './shared/SectionTitle'
import { GlassCard } from './shared/GlassCard'
import { EDUCATION } from '../data/content'
import { useScrollReveal, revealVariantsLeft, revealVariants, revealVariantsCenter } from '../hooks/useScrollReveal'

export function Education() {
  const { ref, isVisible } = useScrollReveal()

  return (
    <section id="education" className="section-padding bg-deep min-h-screen relative overflow-hidden">
      {/* Decorative cyber grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,245,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,245,255,0.015)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />

      <div ref={ref} className="max-w-content mx-auto relative z-10">
        <SectionTitle label="academic" title="EDUCATION.md" />

        <div className="relative mt-16">
          {/* Vertical central spine */}
          <div className="absolute left-4 lg:left-1/2 top-0 bottom-0 w-px bg-cyan-spark/30 lg:-translate-x-1/2 shadow-[0_0_8px_rgba(0,245,255,0.4)]" />

          <div className="space-y-12">
            {EDUCATION.map((edu, idx) => {
              const isEven = idx % 2 === 0
              const metricVal = parseFloat(edu.metric.split(' ')[1]) || 0
              const percentage = (metricVal / 10) * 100

              return (
                <div key={idx} className="relative flex flex-col lg:flex-row lg:items-center">
                  {/* Glowing Node on Spine */}
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={isVisible ? { scale: 1 } : {}}
                    transition={{ delay: idx * 0.2 }}
                    className="absolute left-4 lg:left-1/2 w-6 h-6 rounded-full bg-black border-2 border-cyan-spark -translate-x-3 lg:-translate-x-3 flex items-center justify-center shadow-[0_0_15px_rgba(0,245,255,0.8)] z-20"
                  >
                    <GraduationCap size={12} className="text-cyan-spark" />
                  </motion.div>

                  {/* Left layout content block */}
                  <div className={`w-full lg:w-1/2 pl-12 lg:pl-0 lg:pr-12 ${isEven ? 'lg:text-right' : 'lg:order-2 lg:text-left lg:pl-12'}`}>
                    <motion.div
                      initial="hidden"
                      animate={isVisible ? 'visible' : 'hidden'}
                      variants={isEven ? revealVariantsLeft : revealVariants}
                      transition={{ delay: idx * 0.15 }}
                    >
                      <GlassCard className="p-6 relative group hover:border-cyan-spark/45 transition-colors duration-500">
                        <div className={`flex items-center gap-2 mb-2 font-mono text-xs text-cyan-spark ${isEven ? 'lg:justify-end' : 'lg:justify-start'}`}>
                          <Calendar size={12} />
                          <span>{edu.duration}</span>
                        </div>

                        <h3 className="font-heading font-bold text-xl uppercase text-text-primary group-hover:text-cyan-spark transition-colors duration-300">
                          {edu.credential}
                        </h3>
                        <p className="font-mono text-xs text-text-secondary mt-1">
                          {edu.institution}
                        </p>
                        
                        <div className={`flex items-center gap-2 mt-2 font-mono text-xs text-text-secondary ${isEven ? 'lg:justify-end' : 'lg:justify-start'}`}>
                          <MapPin size={12} className="text-red-core" />
                          <span>{edu.location}</span>
                        </div>

                        {/* CGPA Progress Bar */}
                        <div className="mt-4 text-left">
                          <div className="flex justify-between font-mono text-[11px] mb-1 text-text-secondary">
                            <span className="flex items-center gap-1">
                              <Award size={12} className="text-cyan-spark" />
                              Academic Performance
                            </span>
                            <span className="impact-text text-cyan-spark font-bold">{edu.metric} / 10</span>
                          </div>
                          <div className="h-2 bg-black/50 rounded-full overflow-hidden border border-cyan-spark/20">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-cyan-spark"
                              initial={{ width: 0 }}
                              animate={isVisible ? { width: `${percentage}%` } : {}}
                              transition={{ delay: idx * 0.2 + 0.3, duration: 1, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      </GlassCard>
                    </motion.div>
                  </div>

                  {/* Empty spacer block for lg timeline alignment */}
                  <div className="hidden lg:block lg:w-1/2" />
                </div>
              )
            })}
          </div>
        </div>

        {/* Footnote of current active status */}
        <motion.div
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          variants={revealVariantsCenter}
          transition={{ delay: 0.6 }}
          className="mt-16 flex items-center gap-3 font-mono text-xs text-text-secondary py-3 px-6 bg-white/[0.02] border border-cyan-spark/30 rounded-full max-w-fit mx-auto shadow-[0_0_15px_rgba(0,245,255,0.05)] hover:border-cyan-spark hover:shadow-[0_0_20px_rgba(0,245,255,0.15)] transition-all duration-300"
        >
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-spark opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-spark"></span>
          </span>
          <span>CURRENTLY: Vector India Embedded Systems Training Program, Bengaluru</span>
        </motion.div>
      </div>
    </section>
  )
}
