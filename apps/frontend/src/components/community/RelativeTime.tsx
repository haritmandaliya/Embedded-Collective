import { useState, useEffect } from 'react'
import { timeAgo, parseUTCDate } from './constants'

export function RelativeTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => timeAgo(iso))

  useEffect(() => {
    setText(timeAgo(iso))
    const interval = setInterval(() => {
      setText(timeAgo(iso))
    }, 15000) // update every 15 seconds
    return () => clearInterval(interval)
  }, [iso])

  const dateObj = parseUTCDate(iso)
  const formattedIST = dateObj.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  return (
    <span title={`UTC: ${dateObj.toUTCString()}`} className="inline-flex items-center gap-1 flex-wrap">
      <span>{text}</span>
      <span className="opacity-50 text-[10px] font-normal">({formattedIST} IST)</span>
    </span>
  )
}
