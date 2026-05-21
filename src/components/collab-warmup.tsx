'use client'

import { useEffect } from 'react'

export function CollabWarmup() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    const wsUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL
    if (!wsUrl) return
    try {
      const ws = new WebSocket(wsUrl)
      ws.onopen = () => ws.close()
      ws.onerror = () => {}
    } catch {}
  }, [])

  return null
}
