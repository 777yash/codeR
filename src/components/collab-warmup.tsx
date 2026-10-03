'use client'

import { useEffect } from 'react'

export function CollabWarmup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    const wsUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL
    if (!wsUrl) return
    const controller = new AbortController()
    try {
      const url = new URL(wsUrl)
      url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
      // Wake the HTTP health endpoint; WebSockets now require a room ticket.
      void fetch(url, { mode: 'no-cors', signal: controller.signal }).catch(
        () => {}
      )
    } catch {}
    return () => controller.abort()
  }, [])

  return null
}
