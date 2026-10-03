'use client'

import { useEffect, useState } from 'react'

const POLL_MS = 20_000

export function usePresenceState(roomId: string) {
  const [state, setState] = useState<{
    roomId: string
    ids: string[] | null
  } | null>(null)

  useEffect(() => {
    let cancelled = false
    let controller: AbortController | null = null

    async function ping() {
      if (controller) return
      controller = new AbortController()
      try {
        const res = await fetch(`/api/rooms/${roomId}/presence`, {
          method: 'POST',
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(5000),
          ]),
        })
        const data = res.ok
          ? ((await res.json()) as { onlineIds?: unknown })
          : null
        if (!cancelled)
          setState({
            roomId,
            ids:
              Array.isArray(data?.onlineIds) &&
              data.onlineIds.every((id) => typeof id === 'string')
                ? data.onlineIds
                : null,
          })
      } catch {
        if (!cancelled) setState({ roomId, ids: null })
      } finally {
        controller = null
      }
    }

    ping()
    const id = setInterval(ping, POLL_MS)
    return () => {
      cancelled = true
      controller?.abort()
      clearInterval(id)
    }
  }, [roomId])

  return state?.roomId === roomId ? state.ids : null
}

export function usePresence(roomId: string) {
  return usePresenceState(roomId) ?? []
}
