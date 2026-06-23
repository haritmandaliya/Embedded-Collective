import { useState, useEffect } from 'react'
import { timeAgo } from './constants'

export function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => timeAgo(iso))

  useEffect(() => {
    setText(timeAgo(iso))
    const interval = setInterval(() => {
      setText(timeAgo(iso))
    }, 15000) // update every 15 seconds
    return () => clearInterval(interval)
  }, [iso])

  return <>{text}</>
}
