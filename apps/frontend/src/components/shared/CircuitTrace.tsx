import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'

interface CircuitTraceProps {
  path?: string
  color?: string
  duration?: number
  className?: string
  horizontal?: boolean
  showDot?: boolean
  ambientLoop?: boolean
}

const DEFAULT_PATH = 'M 0 20 L 200 20 L 200 40'

export function CircuitTrace({
  path = DEFAULT_PATH,
  color = '#C0192C',
  duration = 2,
  className = '',
  horizontal = true,
  showDot = true,
  ambientLoop = false,
}: CircuitTraceProps) {
  const ref = useRef<SVGSVGElement>(null)
  const [length, setLength] = useState(0)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(true)
      },
      { threshold: 0.1 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (ref.current) {
      const pathEl = ref.current.querySelector('path')
      if (pathEl) setLength(pathEl.getTotalLength())
    }
  }, [path])

  return (
    <svg
      ref={ref}
      className={`w-full ${horizontal ? 'h-10' : 'h-full w-10'} ${className}`}
      viewBox={horizontal ? '0 0 1200 40' : '0 0 40 200'}
      preserveAspectRatio="none"
      fill="none"
    >
      <motion.path
        d={path}
        stroke={color}
        strokeWidth="1.5"
        strokeOpacity="0.4"
        initial={{ strokeDashoffset: length, strokeDasharray: length }}
        animate={visible ? { strokeDashoffset: 0 } : {}}
        transition={{ duration, ease: 'easeInOut' }}
      />
      {showDot && (visible || ambientLoop) && (
        <motion.circle
          r="4"
          fill={color}
          filter="blur(2px)"
          initial={{ offsetDistance: '0%' }}
          animate={{ offsetDistance: '100%' }}
          transition={{
            duration: ambientLoop ? 6 : duration * 1.5,
            repeat: Infinity,
            ease: 'linear',
          }}
          style={{
            offsetPath: `path('${path}')`,
          }}
        />
      )}
    </svg>
  )
}
