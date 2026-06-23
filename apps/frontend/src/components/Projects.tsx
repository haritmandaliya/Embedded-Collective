import { useState, Suspense, lazy } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { SectionTitle } from './shared/SectionTitle'
import { PROJECTS } from '../data/content'
import { getStaggerVariant, useScrollReveal } from '../hooks/useScrollReveal'
import { ChipHologramReel } from './ChipHologramReel'
import { useTheme } from '../context/ThemeContext'

const ParticleField = lazy(() =>
  import('../three/ParticleField').then((m) => ({ default: m.ParticleField }))
)

type Project = (typeof PROJECTS)[number]

function ProjectCard({
  project,
  index,
  onSelect,
}: {
  project: Project
  index: number
  onSelect: (p: Project) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const stripeColor = project.stripe === 'embedded' ? '#C0192C' : '#00F5FF'

  return (
    <motion.div
      id={`project-card-${project.id}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={getStaggerVariant(index, 3)}
      transition={{ delay: index * 0.1 }}
      className="group relative rounded-lg overflow-hidden cursor-pointer transition-all duration-500 bg-[#111118]/95 border border-white/10 shadow-[0_4px_32px_rgba(0,0,0,0.6)] text-white"
      style={{ transformPerspective: 800 }}
      whileHover={{ y: -12, rotateX: -4, rotateY: 4 }}
      onClick={() => onSelect(project)}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width - 0.5
        const y = (e.clientY - rect.top) / rect.height - 0.5
        e.currentTarget.style.transform = `perspective(800px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateY(-12px)`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = ''
      }}
    >
      <div className="h-1" style={{ backgroundColor: stripeColor }} />
      <div className="p-6 relative">
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at center, rgba(192,25,44,0.15), transparent 70%)',
          }}
        />
        <p className="font-mono text-[10px] text-red-core mb-2">PROJECT_{project.id}</p>
        <h3 className="font-heading font-bold text-xl mb-3 text-white">{project.title}</h3>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {project.tech.map((t) => (
            <span
              key={t}
              className="font-mono text-[10px] px-2 py-0.5 rounded border border-white/10 text-slate-300 group-hover:border-cyan-spark/50 transition-colors bg-white/5"
            >
              {t}
            </span>
          ))}
        </div>
        <p
          className={`font-body font-bold text-sm text-slate-400 leading-[1.95] ${expanded ? '' : 'line-clamp-2'}`}
          onClick={(e) => {
            e.stopPropagation()
            setExpanded(!expanded)
          }}
        >
          {project.description}
        </p>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity mt-4 font-mono text-xs text-red-glow">
          VIEW DETAILS ›
        </div>
      </div>
    </motion.div>
  )
}

function ProjectModal({ project, onClose }: { project: Project; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        layoutId={`project-${project.id}`}
        className="glass-card max-w-2xl w-full p-8 rounded-lg relative max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-red-core hover:text-red-glow"
          aria-label="Close"
        >
          <X size={24} />
        </button>
        <p className="font-mono text-xs text-red-core mb-2">PROJECT_{project.id}</p>
        <h3 className="font-heading font-bold text-2xl mb-4">{project.title}</h3>
        <p className="font-body font-bold text-text-secondary mb-6 leading-[1.95]">{project.description}</p>
        <div className="font-mono text-xs bg-black/50 p-4 rounded border border-red-core/20 mb-6">
          {project.features.map((f, i) => (
            <motion.p
              key={f}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="text-text-secondary mb-1"
            >
              {'>'} {f}
            </motion.p>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {project.tech.map((t) => (
            <span key={t} className="font-mono text-xs px-3 py-1 rounded border border-cyan-spark/40">
              {t}
            </span>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

export function Projects() {
  const { ref } = useScrollReveal()
  const [selected, setSelected] = useState<Project | null>(null)
  const { theme } = useTheme()

  return (
    <section
      id="projects"
      className={`relative section-padding min-h-screen transition-colors duration-500 ${
        theme === 'light' ? 'bg-[#ffffff] text-[#0a0915]' : 'bg-[#050505] text-[#f0f0ff]'
      }`}
    >
      <Suspense fallback={null}>
        <ParticleField />
      </Suspense>

      <div ref={ref} className="relative z-10 max-w-content mx-auto">
        <SectionTitle label="portfolio" title="PROJECTS.build" />

        <ChipHologramReel />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PROJECTS.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} onSelect={setSelected} />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selected && <ProjectModal project={selected} onClose={() => setSelected(null)} />}
      </AnimatePresence>
    </section>
  )
}
