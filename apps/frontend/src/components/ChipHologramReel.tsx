import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { Cpu, Music, Shield, Home } from 'lucide-react'

const HARDWARE_PROJECTS = [
  {
    id: '01',
    title: 'RFID Attendance',
    icon: Shield,
    desc: 'LPC2129 + RFID authentication + DS1307 RTC logging.',
  },
  {
    id: '02',
    title: 'MIDI Drum System',
    icon: Music,
    desc: 'LPC2129 + ADC velocity drum-pads + UART MIDI synthesis.',
  },
  {
    id: '03',
    title: 'Home Automation',
    icon: Home,
    desc: 'Arduino UNO + HC-05 Bluetooth + 4-Channel Relays.',
  },
]

export function ChipHologramReel() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [inView, setInView] = useState(false)
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const reduced = useReducedMotion()

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (entry.isIntersecting && imagesRef.current.length === 0) {
          preloadImages()
        }
      },
      { rootMargin: '200px' }
    )
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    return () => observer.disconnect()
  }, [])

  const preloadImages = () => {
    const loadedList: HTMLImageElement[] = []
    let loadedCount = 0
    const total = 53

    for (let i = 1; i <= total; i++) {
      const img = new Image()
      const pad = String(i).padStart(3, '0')
      img.src = `/videos/frames/projects/${pad}.jpg`
      img.onload = () => {
        loadedCount++
        if (loadedCount === total) {
          setImagesLoaded(true)
        }
      }
      loadedList.push(img)
    }
    imagesRef.current = loadedList
  }

  useEffect(() => {
    if (!imagesLoaded || !inView) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const total = 53
    let frameIndex = 0

    const draw = (idx: number) => {
      const img = imagesRef.current[idx]
      if (img && img.complete) {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      }
    }

    if (reduced) {
      draw(26) // Freeze at frame 27
      return
    }

    let lastTime = 0
    const fps = 24
    const interval = 1000 / fps
    let frameId: number

    const render = (time: number) => {
      if (!lastTime) lastTime = time
      const delta = time - lastTime
      if (delta >= interval) {
        draw(frameIndex)
        frameIndex = (frameIndex + 1) % total
        lastTime = time - (delta % interval)
      }
      frameId = requestAnimationFrame(render)
    }

    frameId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(frameId)
    }
  }, [imagesLoaded, inView, reduced])

  const scrollToProject = (id: string) => {
    const el = document.getElementById(`project-card-${id}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('shadow-[0_0_30px_rgba(0,245,255,0.6)]')
      setTimeout(() => {
        el.classList.remove('shadow-[0_0_30px_rgba(0,245,255,0.6)]')
      }, 1500)
    }
  }

  return (
    <div
      ref={containerRef}
      className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mb-16 p-6 rounded-xl border border-white/10 bg-[#111118]/95 shadow-[0_4px_32px_rgba(0,0,0,0.6)] text-white relative overflow-hidden"
    >
      {/* Background Matrix/Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(192,25,44,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(192,25,44,0.02)_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />

      {/* Left: Canvas Player */}
      <div className="lg:col-span-7 flex flex-col items-center justify-center relative">
        <div className="relative w-full aspect-[640/411] max-w-[640px] overflow-hidden rounded border border-red-core/20 bg-black/60 shadow-[0_0_30px_rgba(192,25,44,0.1)]">
          {/* Hologram scanline & flicker effects */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,36,0.02),rgba(0,0,255,0.06))] bg-[size:100%_4px,6px_100%] pointer-events-none z-10" />
          
          <canvas
            ref={canvasRef}
            width={640}
            height={411}
            className="w-full h-full object-cover block"
          />

          {!imagesLoaded && (
            <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/80">
              <span className="font-mono text-xs text-red-core blink">
                LOADING HOLOGRAM DATA...
              </span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2 mt-3 font-mono text-[10px] text-slate-400">
          <Cpu size={12} className="text-red-core animate-spin" style={{ animationDuration: '4s' }} />
          LPC2129_CORE_HOLOGRAM.reel [24FPS]
        </div>
      </div>

      {/* Right: Description & Pills */}
      <div className="lg:col-span-5 flex flex-col justify-center">
        <h4 className="font-heading font-bold text-lg uppercase tracking-wider mb-2 text-white">
          Hardware Prototyping
        </h4>
        <p className="font-body font-bold text-sm text-slate-400 leading-[1.8] mb-6">
          Physical computing and embedded design cycles. Interact with the system registers below to inspect specific implementation schematics in the projects ledger.
        </p>

        <div className="space-y-3">
          {HARDWARE_PROJECTS.map((proj) => {
            const Icon = proj.icon
            return (
              <button
                key={proj.id}
                onClick={() => scrollToProject(proj.id)}
                className="w-full text-left flex items-start gap-4 p-4 rounded bg-white/[0.02] border border-white/10 hover:border-cyan-spark/50 hover:bg-cyan-spark/5 transition-all duration-300 group hover:shadow-[0_0_15px_rgba(0,245,255,0.1)]"
              >
                <div className="p-2 rounded bg-black/40 border border-red-core/30 group-hover:border-cyan-spark/50 text-red-core group-hover:text-cyan-spark transition-colors mt-0.5">
                  <Icon size={18} />
                </div>
                <div>
                  <h5 className="font-heading font-bold text-sm uppercase text-white group-hover:text-cyan-spark transition-colors">
                    {proj.title}
                  </h5>
                  <p className="font-mono text-xs text-slate-400 mt-1 line-clamp-1">
                    {proj.desc}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
