import { motion, type MotionStyle } from 'framer-motion'
import { type ReactNode, useRef } from 'react'
import { useMouseParallax } from '../../hooks/useMouseParallax'

interface GlassCardProps {
  children: ReactNode
  className?: string
  tiltIntensity?: number
  glowColor?: string
  enableTilt?: boolean
  onClick?: () => void
  style?: MotionStyle
}

export function GlassCard({
  children,
  className = '',
  tiltIntensity = 8,
  glowColor = 'rgba(192, 25, 44, 0.2)',
  enableTilt = true,
  onClick,
  style,
}: GlassCardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { rotateX, rotateY } = useMouseParallax({
    maxDeg: tiltIntensity,
    containerRef,
  })

  return (
    <motion.div
      ref={containerRef}
      className={`glass-card rounded-lg transition-all duration-300 ${className}`}
      style={{
        ...(enableTilt ? { rotateX, rotateY, transformPerspective: 800 } : {}),
        ...style,
      }}
      whileHover={{
        borderColor: 'rgba(192, 25, 44, 0.7)',
        boxShadow: `0 0 30px ${glowColor}, inset 0 0 20px rgba(192, 25, 44, 0.05)`,
        y: -8,
      }}
      onClick={onClick}
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      >
        <path d="M0,0 L20,0 L20,20" stroke="rgba(192,25,44,0.5)" fill="none" strokeWidth="1" />
        <path
          d="M100%,0 Lcalc(100% - 20px),0 Lcalc(100% - 20px),20"
          stroke="rgba(192,25,44,0.5)"
          fill="none"
          strokeWidth="1"
        />
      </svg>
      {children}
    </motion.div>
  )
}
