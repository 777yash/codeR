import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton'

export default function RoomLoading() {
  return (
    <SkeletonGroup className="bg-app text-app flex h-dvh flex-col">
      <header className="border-app flex h-11 shrink-0 items-center justify-between gap-4 border-b px-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded-md" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="hidden h-6 w-24 rounded-full sm:block" />
          <Skeleton className="h-7 w-16 rounded-md" />
          <Skeleton className="h-7 w-7 rounded-full" />
        </div>
      </header>

      {/* editor toolbar */}
      <Skeleton className="h-9 w-full rounded-none" />

      <div className="flex flex-1 overflow-hidden">
        {/* file explorer */}
        <aside className="border-app bg-app-surface hidden w-56 shrink-0 flex-col gap-2 border-r p-3 md:flex">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-full" />
          ))}
        </aside>

        {/* editor */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="border-app flex h-9 shrink-0 items-center gap-2 border-b px-2">
            <Skeleton className="h-6 w-28 rounded-md" />
            <Skeleton className="h-6 w-28 rounded-md" />
          </div>
          <div className="flex-1 space-y-3 p-4">
            {[
              '60%',
              '85%',
              '45%',
              '72%',
              '90%',
              '38%',
              '66%',
              '80%',
              '52%',
            ].map((w, i) => (
              <Skeleton key={i} className="h-4" style={{ width: w }} />
            ))}
          </div>
        </div>

        {/* collab rail */}
        <aside className="border-app bg-app-surface hidden w-72 shrink-0 flex-col gap-3 border-l p-3 lg:flex">
          <Skeleton className="h-8 w-full rounded-md" />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </aside>
      </div>

      {/* status bar */}
      <Skeleton className="h-6 w-full rounded-none" />
    </SkeletonGroup>
  )
}
