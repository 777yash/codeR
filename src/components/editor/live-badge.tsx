'use client'

import { usePresenceState } from '@/hooks/use-presence'

export function LiveBadge({ roomId }: { roomId: string }) {
  const onlineIds = usePresenceState(roomId)
  const count = onlineIds?.length ?? null

  // null = first fetch not yet resolved — render placeholder same size to avoid layout shift
  if (count === null) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-[var(--coder-border)] px-2.5 py-1">
        <div className="h-1.5 w-1.5 rounded-full bg-[var(--coder-text-tertiary)]" />
        <span className="text-[11px] text-[var(--coder-text-tertiary)]">
          Presence unavailable
        </span>
      </div>
    )
  }

  return (
    <div className="room-live-badge flex items-center gap-1.5 rounded-full border border-[var(--coder-border)] px-2.5 py-1">
      <span className="relative flex h-1.5 w-1.5">
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#32D74B]" />
      </span>
      <span className="text-app-muted text-[11px] font-medium">
        Live · {count} {count === 1 ? 'user' : 'users'}
      </span>
    </div>
  )
}
