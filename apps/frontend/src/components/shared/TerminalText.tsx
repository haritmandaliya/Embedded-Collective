import { useEffect, useState } from 'react'
import { useReducedMotion } from '../../hooks/useReducedMotion'

interface TerminalTextProps {
  text: string
  speed?: number
  cursor?: boolean
  onComplete?: () => void
  className?: string
}

export function TerminalText({
  text,
  speed = 18,
  cursor = true,
  onComplete,
  className = '',
}: TerminalTextProps) {
  const reduced = useReducedMotion()
  const [displayed, setDisplayed] = useState(reduced ? text : '')
  const [done, setDone] = useState(reduced)

  useEffect(() => {
    if (reduced) {
      setDisplayed(text)
      setDone(true)
      onComplete?.()
      return
    }

    let i = 0
    const interval = setInterval(() => {
      i++
      setDisplayed(text.slice(0, i))
      if (i >= text.length) {
        clearInterval(interval)
        setDone(true)
        onComplete?.()
      }
    }, speed)

    return () => clearInterval(interval)
  }, [text, speed, reduced, onComplete])

  return (
    <span className={className}>
      {displayed}
      {cursor && (
        <span className={done ? 'opacity-60' : 'blink'}>
          {done ? '|' : '█'}
        </span>
      )}
    </span>
  )
}
