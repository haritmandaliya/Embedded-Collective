import { Wrench } from 'lucide-react'

export function ContributorTag() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[--cyan-spark]/10 border border-[--cyan-spark]/30 font-mono text-[10px] text-[--cyan-spark] uppercase tracking-wider">
      <Wrench size={9} />
      CONTRIBUTOR
    </span>
  )
}
