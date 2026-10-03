import { Skeleton, SkeletonGroup } from '@/components/ui/skeleton'

export default function ProfileLoading() {
  return (
    <SkeletonGroup className="bg-app text-app flex h-dvh flex-col">
      <header className="workspace-header border-app flex shrink-0 items-center justify-between gap-4 border-b px-4">
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="workspace-sidebar border-app bg-app-surface hidden shrink-0 flex-col gap-2 border-r p-3 md:flex">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </aside>

        <main className="workspace-main flex-1 overflow-y-auto">
          <Skeleton className="mb-8 h-8 w-40" />
          <div className="profile-grid">
            <div className="profile-card space-y-6">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
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
            <div className="space-y-6">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </div>
        </main>
      </div>
    </SkeletonGroup>
  )
}
