export function QuestionCardSkeleton() {
  return (
    <div className="glass-card p-6 rounded-lg border border-[--glass-border] animate-pulse">
      <div className="flex gap-4">
        <div className="w-8 space-y-2">
          <div className="h-3 w-3 bg-[--red-core]/5 rounded mx-auto" />
          <div className="h-4 w-6 bg-[--red-core]/5 rounded mx-auto" />
          <div className="h-3 w-3 bg-[--red-core]/5 rounded mx-auto" />
        </div>
        <div className="flex-1 space-y-3">
          <div className="flex gap-2">
            <div className="h-4 w-16 bg-[--red-core]/5 rounded" />
            <div className="h-4 w-24 bg-[--red-core]/5 rounded" />
          </div>
          <div className="h-5 w-4/5 bg-[--red-core]/5 rounded" />
          <div className="h-4 w-3/5 bg-[--red-core]/5 rounded" />
          <div className="h-3 w-2/5 bg-[--red-core]/5 rounded" />
        </div>
      </div>
    </div>
  )
}
