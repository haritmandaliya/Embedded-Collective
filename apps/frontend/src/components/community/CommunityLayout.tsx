import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { CommunityNav } from './CommunityNav'

export function CommunityLayout() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, i) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLElement
            el.style.animationDelay = `${i * 80}ms`
            el.classList.add('animate-in')
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 }
    )

    const observe = () => {
      document.querySelectorAll('.card, .stat-card, .problem-card').forEach((node) => {
        const el = node as HTMLElement
        if (!el.classList.contains('animate-in')) {
          el.style.opacity = '0'
          observer.observe(el)
        }
      })
    }

    observe()
    const timer = setTimeout(observe, 500)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [])

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-text-primary">
      <CommunityNav />
      <Outlet />
    </div>
  )
}
