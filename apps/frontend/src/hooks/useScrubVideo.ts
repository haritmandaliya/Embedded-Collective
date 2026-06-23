import { useEffect, useRef, type RefObject } from 'react'

export const FRAME_COUNT = 116
export const SKILLS_KEY_STEP = 2
export const TRAINING_KEY_STEP = 2

interface ScrubOptions {
  canvasRef: RefObject<HTMLCanvasElement | null>
  framesPath: string
  frameCount?: number
  pixelsToFrames?: number
  momentumDecay?: number
  keyStep?: number
}

function padFrame(index: number) {
  return String(index + 1).padStart(3, '0')
}

export function useScrubVideo(
  sectionRef: RefObject<HTMLElement | null>,
  {
    canvasRef,
    framesPath,
    frameCount = FRAME_COUNT,
    pixelsToFrames = 0.12,
    momentumDecay = 4.8,
    keyStep = SKILLS_KEY_STEP,
  }: ScrubOptions
) {
  const targetFrame = useRef(0)
  const velocity = useRef(0)
  const isDragging = useRef(false)
  const isHovering = useRef(false)
  const isInteracting = useRef(false)
  const sectionActive = useRef(false)
  const lastPointerX = useRef<number | null>(null)
  const lastTimestamp = useRef<number | null>(null)

  useEffect(() => {
    const section = sectionRef.current
    const canvas = canvasRef.current
    if (!section || !canvas) return

    let cancelled = false
    let physicsRaf = 0
    let resizeObserver: ResizeObserver | null = null
    let displayedFrame = -1
    const frames: (HTMLImageElement | null)[] = Array.from({ length: frameCount }, () => null)
    let loadedCount = 0
    let ready = false

    const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true })
    if (!ctx) return

    const wrapFrame = (f: number) => {
      let r = f % frameCount
      if (r < 0) r += frameCount
      return r
    }

    const setSectionActive = (active: boolean) => {
      if (sectionActive.current === active) return
      sectionActive.current = active
      section.classList.toggle('scrub-section--active', active)
    }

    const resizeCanvas = () => {
      const parent = canvas.parentElement
      if (!parent) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = Math.floor(parent.clientWidth * dpr)
      const h = Math.floor(parent.clientHeight * dpr)
      if (w > 0 && h > 0 && (canvas.width !== w || canvas.height !== h)) {
        canvas.width = w
        canvas.height = h
      }
    }

    const paintFrame = (frameIndex: number) => {
      const frame = Math.round(wrapFrame(frameIndex))
      if (frame === displayedFrame) return

      const img = frames[frame]
      if (!img || !img.complete || img.naturalWidth === 0) return

      displayedFrame = frame
      resizeCanvas()

      const cw = canvas.width
      const ch = canvas.height
      if (cw === 0 || ch === 0) return

      const iw = img.naturalWidth
      const ih = img.naturalHeight
      const scale = Math.max(cw / iw, ch / ih)
      const dw = iw * scale
      const dh = ih * scale
      const dx = (cw - dw) / 2
      const dy = (ch - dh) / 2

      ctx.drawImage(img, dx, dy, dw, dh)
    }

    const showTarget = () => {
      paintFrame(targetFrame.current)
    }

    const preloadFrames = () => {
      for (let i = 0; i < frameCount; i++) {
        const img = new Image()
        img.decoding = 'async'
        img.src = `${framesPath}/${padFrame(i)}.jpg`
        img.onload = () => {
          if (cancelled) return
          loadedCount += 1
          frames[i] = img
          if (loadedCount === 1) {
            ready = true
            showTarget()
          }
          if (loadedCount === frameCount) {
            ready = true
            showTarget()
          }
        }
        img.onerror = () => {
          if (cancelled) return
          loadedCount += 1
        }
      }
    }

    preloadFrames()

    resizeObserver = new ResizeObserver(() => {
      resizeCanvas()
      showTarget()
    })
    const stage = canvas.parentElement
    if (stage) resizeObserver.observe(stage)
    resizeCanvas()

    const applyPointerDelta = (deltaPx: number, dtMs: number) => {
      if (!ready) return
      const frameDelta = -deltaPx * pixelsToFrames
      targetFrame.current = wrapFrame(targetFrame.current + frameDelta)
      const dtSec = Math.max(dtMs, 1) / 1000
      velocity.current = frameDelta / dtSec
      showTarget()
    }

    const trackPointer = (clientX: number) => {
      const now = performance.now()
      if (lastPointerX.current === null) {
        lastPointerX.current = clientX
        lastTimestamp.current = now
        return
      }
      const deltaPx = clientX - lastPointerX.current
      const dtMs = now - (lastTimestamp.current ?? now)
      lastPointerX.current = clientX
      lastTimestamp.current = now
      applyPointerDelta(deltaPx, dtMs)
    }

    const resetPointer = () => {
      lastPointerX.current = null
      lastTimestamp.current = null
    }

    const onPointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      isDragging.current = true
      isInteracting.current = true
      velocity.current = 0
      resetPointer()
      trackPointer(e.clientX)
      setSectionActive(true)
      try {
        section.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }

    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch' && !isDragging.current) return
      if (e.pointerType === 'mouse') isHovering.current = true
      isInteracting.current = true
      setSectionActive(true)
      const rect = section.getBoundingClientRect()
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      targetFrame.current = ratio * (frameCount - 1)
      showTarget()
    }

    const onPointerUp = (e: PointerEvent) => {
      isDragging.current = false
      isInteracting.current = isHovering.current
      resetPointer()
      try {
        section.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      if (!isHovering.current) setSectionActive(false)
    }

    const onPointerEnter = () => {
      isHovering.current = true
      setSectionActive(true)
    }

    const onPointerLeave = () => {
      isHovering.current = false
      isDragging.current = false
      isInteracting.current = false
      velocity.current = 0
      resetPointer()
      setSectionActive(false)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
      e.preventDefault()
      setSectionActive(true)
      const dir = e.key === 'ArrowLeft' ? -1 : 1
      targetFrame.current = wrapFrame(targetFrame.current + dir * keyStep)
      velocity.current = dir * keyStep * 12
      showTarget()
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        setSectionActive(false)
      }
    }

    section.addEventListener('pointerdown', onPointerDown)
    section.addEventListener('pointermove', onPointerMove)
    section.addEventListener('pointerup', onPointerUp)
    section.addEventListener('pointercancel', onPointerUp)
    section.addEventListener('pointerenter', onPointerEnter)
    section.addEventListener('pointerleave', onPointerLeave)
    if (!section.hasAttribute('tabindex')) {
      section.setAttribute('tabindex', '0')
    }
    section.addEventListener('keydown', onKeyDown)
    section.addEventListener('keyup', onKeyUp)

    let lastFrameTime = performance.now()
    const velocityFloor = 0.4

    const tick = (now: number) => {
      if (cancelled) return

      const dt = Math.min((now - lastFrameTime) / 1000, 0.05)
      lastFrameTime = now

      if (ready && !isInteracting.current) {
        if (Math.abs(velocity.current) > velocityFloor) {
          targetFrame.current = wrapFrame(targetFrame.current + velocity.current * dt)
          velocity.current *= Math.exp(-momentumDecay * dt)
          showTarget()
        } else {
          velocity.current = 0
        }
      }

      physicsRaf = requestAnimationFrame(tick)
    }

    physicsRaf = requestAnimationFrame(tick)

    return () => {
      cancelled = true
      cancelAnimationFrame(physicsRaf)
      resizeObserver?.disconnect()
      section.classList.remove('scrub-section--active')
      section.removeEventListener('pointerdown', onPointerDown)
      section.removeEventListener('pointermove', onPointerMove)
      section.removeEventListener('pointerup', onPointerUp)
      section.removeEventListener('pointercancel', onPointerUp)
      section.removeEventListener('pointerenter', onPointerEnter)
      section.removeEventListener('pointerleave', onPointerLeave)
      section.removeEventListener('keydown', onKeyDown)
      section.removeEventListener('keyup', onKeyUp)
    }
  }, [
    sectionRef,
    canvasRef,
    framesPath,
    frameCount,
    pixelsToFrames,
    momentumDecay,
    keyStep,
  ])
}
