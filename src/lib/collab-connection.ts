import type { WebsocketProvider } from 'y-websocket'

type Role = 'OWNER' | 'EDITOR' | 'VIEWER'

/** Own reconnection so every attempt obtains a fresh, session-authenticated ticket. */
export function startCollabConnection(
  provider: WebsocketProvider,
  roomId: string,
  clientId: number,
  callbacks: {
    onRole: (role: Role) => void
    onRoleChanged: () => void
    onDenied: (status: number) => void
    onDisconnected: () => void
  }
): () => void {
  let stopped = false
  let previousRole: Role | undefined
  let delay = 1000
  let timer: ReturnType<typeof setTimeout> | undefined
  let request: AbortController | undefined
  const retry = () => {
    if (stopped || timer) return
    timer = setTimeout(() => {
      timer = undefined
      void connect()
    }, delay)
    delay = Math.min(delay * 2, 30_000)
  }
  const connect = async () => {
    request = new AbortController()
    const timeout = setTimeout(() => request?.abort(), 10_000)
    try {
      const response = await fetch(
        `/api/rooms/${encodeURIComponent(roomId)}/collab`,
        {
          method: 'POST',
          credentials: 'same-origin',
          cache: 'no-store',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId }),
          signal: request.signal,
        }
      )
      if (stopped) return
      if (response.status === 401 || response.status === 403) {
        stopped = true
        callbacks.onDenied(response.status)
        return
      }
      if (!response.ok) throw new Error('Ticket unavailable')
      const { token, role } = (await response.json()) as {
        token: string
        role: Role
      }
      if (stopped) return
      if (
        typeof token !== 'string' ||
        !['OWNER', 'EDITOR', 'VIEWER'].includes(role)
      )
        throw new Error('Invalid ticket response')
      if (previousRole && previousRole !== role) {
        // Discard old local CRDT state on a role transition. In particular, never
        // upload viewer-local changes when the same tab is promoted to editor.
        stopped = true
        callbacks.onRoleChanged()
        return
      }
      previousRole = role
      callbacks.onRole(role)
      provider.params = { ticket: token }
      provider.connect()
    } catch {
      retry()
    } finally {
      clearTimeout(timeout)
    }
  }
  const onClose = () => {
    // y-websocket emits this before scheduling its own retry; disable that retry.
    provider.shouldConnect = false
    callbacks.onDisconnected()
    retry()
  }
  const onSync = (synced: boolean) => {
    if (synced) delay = 1000
  }
  provider.on('connection-close', onClose)
  provider.on('sync', onSync)
  void connect()
  return () => {
    stopped = true
    clearTimeout(timer)
    request?.abort()
    provider.shouldConnect = false
    provider.off('connection-close', onClose)
    provider.off('sync', onSync)
  }
}
