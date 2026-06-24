import { Code2, Cpu, Terminal, Network, HelpCircle, type LucideIcon } from 'lucide-react'

export const PROBLEM_CATEGORIES = [
  { label: 'All', value: '', short: 'All' },
  { label: 'Software', value: 'Software Problems', short: 'Software' },
  { label: 'Hardware', value: 'Hardware Problems', short: 'Hardware' },
  { label: 'Programming', value: 'Programming Issues', short: 'Programming' },
  { label: 'Protocols', value: 'Communication Protocols', short: 'Protocols' },
  { label: 'Other', value: 'Other', short: 'Other' },
] as const

export const ASK_CATEGORIES: {
  value: string
  label: string
  desc: string
  icon: LucideIcon
}[] = [
  { value: 'Software Problems', label: 'Software Problems', desc: 'OS, drivers, application logic', icon: Code2 },
  { value: 'Hardware Problems', label: 'Hardware Problems', desc: 'Circuit, component, PCB issues', icon: Cpu },
  { value: 'Programming Issues', label: 'Programming Issues', desc: 'C, C++, Embedded C bugs', icon: Terminal },
  { value: 'Communication Protocols', label: 'Communication Protocols', desc: 'UART, SPI, I2C, CAN', icon: Network },
  { value: 'Other', label: 'Other', desc: 'Anything else embedded', icon: HelpCircle },
]

export function statusChip(status?: string, isSolved?: boolean) {
  if (isSolved || status === 'solved') return { label: 'SOLVED', className: 'bg-green-500/10 text-green-400 border-green-500/30' }
  if (status === 'in_progress') return { label: 'IN PROGRESS', className: 'bg-cyan-spark/10 text-cyan-spark border-cyan-spark/30' }
  return { label: 'OPEN', className: 'bg-amber-500/10 text-amber-400 border-amber-500/30' }
}

export function parseUTCDate(dateString: string): Date {
  if (!dateString) return new Date()
  let formatted = dateString
  if (!formatted.endsWith('Z') && !formatted.includes('+') && !/-\d{2}:\d{2}$/.test(formatted)) {
    formatted = formatted + 'Z'
  }
  return new Date(formatted)
}

export function timeAgo(iso: string) {
  const dateObj = parseUTCDate(iso)
  const diff = Date.now() - dateObj.getTime()
  const mins = Math.max(0, Math.floor(diff / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
