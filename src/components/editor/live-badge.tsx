'use client'

import { useEffect, useState } from 'react'

export function LiveBadge({ roomId }: { roomId: string }) {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    async function ping() {
      try {
        const res = await fetch(`/api/rooms/${roomId}/presence`, {
          method: 'POST',
        })
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { onlineIds: string[] }
          setCount(data.onlineIds.length)
        }
      } catch {
        // keep previous count on network error
      }
    }

    ping()
    const id = setInterval(ping, 20_000)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [roomId])

  // null = first fetch not yet resolved — render placeholder same size to avoid layout shift
  if (count === null) {
    return (
      <div className="flex items-center gap-1.5 rounded-full border border-white/[0.04] px-2.5 py-1">
        <div className="h-1.5 w-1.5 rounded-full bg-[#333]" />
        <span className="text-[11px] text-[#333]">Live</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[rgba(50,215,75,0.08)] px-2.5 py-1">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#32D74B] opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#32D74B]" />
      </span>
      <span className="text-[11px] font-medium text-[#32D74B]">
        Live · {count} {count === 1 ? 'user' : 'users'}
      </span>
    </div>
  )
}
