import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useScrollReveal, getStaggerVariant } from '../hooks/useScrollReveal'
import { useReducedMotion } from '../hooks/useReducedMotion'

const PHILOSOPHY_LINES = [
  { parts: [{ t: 'struct ', c: 'keyword' }, { t: 'India', c: 'type' }, { t: ' {', c: 'op' }] },
  {
    parts: [
      { t: '    ', c: 'plain' },
      { t: 'Made_in_India', c: 'type' },
      { t: '  ', c: 'plain' },
      { t: 'Make_in_India', c: 'field' },
      { t: ';', c: 'op' },
    ],
  },
  { parts: [{ t: '};', c: 'op' }] },
  { parts: [{ t: '', c: 'plain' }] },
  {
    parts: [
      { t: 'India', c: 'type' },
      { t: '  ', c: 'plain' },
      { t: 'EmbeddedSys', c: 'type' },
      { t: ';', c: 'op' },
    ],
  },
  { parts: [{ t: '', c: 'plain' }] },
  {
    parts: [
      { t: 'EmbeddedSys', c: 'type' },
      { t: '->', c: 'arrow' },
      { t: 'Make_in_India', c: 'field' },
    ],
    pulseArrow: true,
  },
  {
    parts: [
      { t: '      ', c: 'plain' },
      { t: '= ', c: 'op' },
      { t: '"Building embedded solutions from India, for the world."', c: 'string' },
      { t: ';', c: 'op' },
    ],
  },
] as const

const BOTTOM_CARDS = [
  {
    label: 'EXPERTISE',
    lines: [
      'struct Skill {',
      '  domain = "Firmware";',
      '  hardware = "ARM7 LPC2129";',
      '  protocols = "UART|SPI|I2C|CAN";',
      '}',
    ],
  },
  {
    label: 'PHILOSOPHY',
    lines: [
      'struct Mission {',
      '  target = "Real hardware";',
      '  approach = "Debug first, ship second";',
      '  origin = "India";',
      '}',
    ],
  },
  {
    label: 'COMMUNITY',
    lines: [
      'struct Platform {',
      '  name = "Embedded Collective";',
      '  goal = "Connect engineers";',
      '  origin = "Made in India";',
      '}',
    ],
  },
] as const

function colorClass(kind: string, text?: string) {
  const trimmed = text ? text.trim() : '';
  if (trimmed === 'Made_in_India' || trimmed === 'Make_in_India') {
    return 'text-white'
  }
  switch (kind) {
    case 'keyword':
      return 'text-cyan-spark'
    case 'type':
      return 'text-red-glow'
    case 'field':
      return 'text-gray-100'
    case 'op':
      return 'text-yellow-400'
    case 'string':
      return 'text-green-400'
    case 'arrow':
      return 'text-cyan-spark pulse-glow-arrow'
    default:
      return 'text-gray-100'
  }
}

function PhilosophyTypewriter({ active }: { active: boolean }) {
  const reduced = useReducedMotion()
  const fullText = PHILOSOPHY_LINES.map((l) => l.parts.map((p) => p.t).join('')).join('\n')
  const [revealed, setRevealed] = useState(reduced ? fullText.length : 0)
  const [done, setDone] = useState(reduced)

  useEffect(() => {
    if (!active || reduced) {
      setRevealed(fullText.length)
      setDone(true)
      return
    }
    setRevealed(0)
    setDone(false)
    let i = 0
    const interval = setInterval(() => {
      i++
      setRevealed(i)
      if (i >= fullText.length) {
        clearInterval(interval)
        setDone(true)
      }
    }, 18)
    return () => clearInterval(interval)
  }, [active, reduced, fullText.length])

  let charIndex = 0

  return (
    <pre className="font-mono text-sm leading-relaxed whitespace-pre-wrap text-gray-100">
      {PHILOSOPHY_LINES.map((line, li) => (
        <div key={li}>
          {line.parts.map((part, pi) => {
            const start = charIndex
            charIndex += part.t.length
            const visible = part.t.slice(0, Math.max(0, revealed - start))
            if (!visible) return null
            return (
              <span
                key={pi}
                className={`${colorClass(part.c, part.t)} ${'pulseArrow' in line && line.pulseArrow && part.c === 'arrow' && done ? 'pulse-glow-arrow' : ''}`}
              >
                {visible}
              </span>
            )
          })}
        </div>
      ))}
      {!done && <span className="blink text-red-core">█</span>}
      {done && (
        <span className="typing-cursor-line text-transparent select-none" aria-hidden>
          &nbsp;
        </span>
      )}
    </pre>
  )
}

function TerminalCard({ lines }: { lines: readonly string[] }) {
  return (
    <pre className="font-mono text-sm leading-relaxed text-gray-400">
      {lines.map((line, i) => (
        <div key={i}>
          {line.split(/(".*?")/).map((chunk, j) =>
            chunk.startsWith('"') ? (
              <span
                key={j}
                className={
                  (chunk === '"India"' || chunk === '"Made in India"')
                    ? 'text-white'
                    : 'text-green-400'
                }
              >
                {chunk}
              </span>
            ) : (
              <span key={j}>
                {chunk.split(/(struct|{|}|;|=)/).map((seg, k) => {
                  if (seg === 'struct') return <span key={k} className="text-cyan-spark">{seg}</span>
                  if (['{', '}', ';', '='].includes(seg))
                    return <span key={k} className="text-yellow-400">{seg}</span>
                  return <span key={k}>{seg}</span>
                })}
              </span>
            )
          )}
        </div>
      ))}
    </pre>
  )
}

export function Contributor() {
  const { ref, isVisible } = useScrollReveal<HTMLElement>()
  const cardReveal = useScrollReveal<HTMLDivElement>()

  return (
    <section
      id="contributor"
      ref={ref}
      className="relative w-full py-32 bg-deep border-y border-red-core/10"
    >
      <div className="max-w-content mx-auto px-6">
        <p className="font-mono text-sm text-red-core mb-4">// THE PHILOSOPHY</p>
        <h2 className="font-heading font-bold text-4xl md:text-5xl uppercase text-text-primary mb-8 leading-tight">
          Contributing To
          <br />
          Embedded India
        </h2>

        <div className="h-px w-full bg-red-core/20 mb-10" />

        <div
          className="rounded-lg p-6 md:p-8 mb-12 struct-block terminal-block"
          style={{ background: '#0D0D0D' }}
        >
          <PhilosophyTypewriter active={isVisible} />
        </div>

        <div ref={cardReveal.ref} className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {BOTTOM_CARDS.map((card, i) => (
            <motion.div
              key={card.label}
              initial="hidden"
              animate={cardReveal.isVisible ? 'visible' : 'hidden'}
              variants={getStaggerVariant(i, 3)}
              className="rounded-lg p-5 struct-block terminal-block"
              style={{ background: '#0D0D0D' }}
            >
              <TerminalCard lines={card.lines} />
              <p className="struct-label">{card.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
