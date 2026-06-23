import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton'

export default function DashboardLoading() {
  return (
    <SkeletonGroup className="bg-app text-app flex h-dvh flex-col overflow-hidden">
      <header className="border-app flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="hidden h-9 w-64 rounded-full md:block" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="border-app bg-app-surface hidden w-[220px] shrink-0 flex-col gap-2 border-r p-3 md:flex">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Skeleton className="mb-3 h-8 w-48" />
          <Skeleton className="mb-8 h-4 w-64" />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-48 w-full rounded-xl" />
            ))}
          </div>
        </main>
      </div>
    </SkeletonGroup>
  )
}
