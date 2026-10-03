/** Best effort fast revocation. Every server also checks access on a short lease. */
export async function notifyCollabAccessChanged(
  roomId: string,
  userId?: string
): Promise<void> {
  const secret = process.env.NEXTJS_INTERNAL_SECRET
  const wsUrl = process.env.NEXT_PUBLIC_COLLAB_WS_URL
  if (!secret || !wsUrl) return
  try {
    const url = new URL(wsUrl)
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
    url.pathname = `${url.pathname.replace(/\/$/, '')}/revoke-access/${encodeURIComponent(roomId)}`
    url.search = ''
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ userId }),
      signal: AbortSignal.timeout(2000),
    })
    if (!response.ok)
      console.warn(
        '[collab] Immediate revocation unavailable; lease checks remain active'
      )
  } catch {
    console.warn(
      '[collab] Immediate revocation unavailable; lease checks remain active'
    )
  }
}
