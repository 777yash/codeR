import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton'

export default function ProfileLoading() {
  return (
    <SkeletonGroup className="bg-app text-app flex h-dvh flex-col">
      <header className="border-app flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="border-app bg-app-surface hidden w-[220px] shrink-0 flex-col gap-2 border-r p-3 md:flex">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-lg space-y-6">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-52" />
              </div>
            </div>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
            <Skeleton className="h-10 w-32 rounded-lg" />
          </div>
        </main>
      </div>
    </SkeletonGroup>
  )
}
