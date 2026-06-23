import { useEffect, useRef } from 'react'
import { useMotionValue, useSpring } from 'framer-motion'

interface UseMouseParallaxOptions {
  maxDeg?: number
  containerRef?: React.RefObject<HTMLElement | null>
}

export function useMouseParallax({ maxDeg = 8, containerRef }: UseMouseParallaxOptions = {}) {
  const internalRef = useRef<HTMLElement | null>(null)
  const ref = containerRef ?? internalRef

  const rotateX = useMotionValue(0)
  const rotateY = useMotionValue(0)
  const springX = useSpring(rotateX, { stiffness: 200, damping: 30 })
  const springY = useSpring(rotateY, { stiffness: 200, damping: 30 })

  useEffect(() => {
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced) return

    const handleMove = (e: MouseEvent) => {
      const el = ref.current
      if (!el) return
      const rect = el.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width - 0.5
      const y = (e.clientY - rect.top) / rect.height - 0.5
      rotateY.set(x * maxDeg * 2)
      rotateX.set(-y * maxDeg * 2)
    }

    const handleLeave = () => {
      rotateX.set(0)
      rotateY.set(0)
    }

    const el = ref.current
    if (!el) return

    el.addEventListener('mousemove', handleMove)
    el.addEventListener('mouseleave', handleLeave)
    return () => {
      el.removeEventListener('mousemove', handleMove)
      el.removeEventListener('mouseleave', handleLeave)
    }
  }, [maxDeg, ref, rotateX, rotateY])

  return { rotateX: springX, rotateY: springY, ref: internalRef }
}
