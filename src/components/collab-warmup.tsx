'use client'

import { useEffect } from 'react'

export function CollabWarmup() {
  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? 'ws://localhost:1234'
    const httpUrl = wsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:')
    fetch(httpUrl, { signal: AbortSignal.timeout(5000) }).catch(() => {})
  }, [])

  return null
}
