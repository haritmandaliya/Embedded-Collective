import { useRef, type ReactNode, type MouseEvent } from 'react'
import { useNavigate } from 'react-router-dom'

interface MagneticButtonProps {
  children: ReactNode
  className?: string
  href?: string
  download?: boolean
  onClick?: () => void
}

export function MagneticButton({ children, className = '', href, download, onClick }: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null)
  const navigate = useNavigate()

  const handleMove = (e: MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left - rect.width / 2
    const y = e.clientY - rect.top - rect.height / 2
    const dist = Math.sqrt(x * x + y * y)
    if (dist < 120) {
      const factor = (120 - dist) / 120
      el.style.transform = `translate(${x * factor * 0.15}px, ${y * factor * 0.15}px)`
    }
  }

  const handleLeave = () => {
    if (ref.current) ref.current.style.transform = ''
  }

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (onClick) {
      onClick()
    }
    if (href && href.startsWith('/') && !download) {
      e.preventDefault()
      navigate(href)
    }
  }

  return (
    <a
      ref={ref}
      href={href}
      download={download}
      onClick={handleClick}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      className={className}
    >
      {children}
    </a>
  )
}
