'use client'

import { useEffect, useState } from 'react'

const POLL_MS = 20_000

export function usePresence(roomId: string) {
  const [onlineIds, setOnlineIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false

    async function ping() {
      try {
        const res = await fetch(`/api/rooms/${roomId}/presence`, {
          method: 'POST',
        })
        if (res.ok && !cancelled) {
          const data = (await res.json()) as { onlineIds: string[] }
          setOnlineIds(data.onlineIds)
        }
      } catch {
        // network error — keep previous state
      }
    }

    ping()
    const id = setInterval(ping, POLL_MS)
    return () => {
      cancelled = true
      clearInterval(id)
    }
  }, [roomId])

  return onlineIds
}
