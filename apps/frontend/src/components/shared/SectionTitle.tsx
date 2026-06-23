import { motion } from 'framer-motion'
import { useScrollReveal } from '../../hooks/useScrollReveal'

interface SectionTitleProps {
  label?: string
  title: string
  className?: string
}

export function SectionTitle({ label, title, className = '' }: SectionTitleProps) {
  const { ref, isVisible } = useScrollReveal<HTMLDivElement>()

  return (
    <div ref={ref} className={`mb-12 ${className}`}>
      {label && (
        <p className="font-mono text-xs uppercase tracking-widest text-red-core mb-2">
          // {label}
        </p>
      )}
      <motion.h2
        initial={{ opacity: 0, x: 60, skewX: -8 }}
        animate={isVisible ? { opacity: 1, x: 0, skewX: 0 } : {}}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-[0.06em] text-text-primary"
      >
        {title}
      </motion.h2>
      <svg className="mt-4 h-1 w-48" viewBox="0 0 192 4" fill="none">
        <motion.line
          x1="0"
          y1="2"
          x2="192"
          y2="2"
          stroke="#C0192C"
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={isVisible ? { pathLength: 1 } : {}}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
    </div>
  )
}
