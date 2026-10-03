// Client-initiated snapshot persistence. The collab-server saves on a 30s
// interval + last-client-leave, which loses AI scaffolds / offline edits when
// the tab closes inside that window (or while the WS is down). These helpers
// push the browser's full Yjs state to the member-authorized flush route,
// where it CRDT-merges with the stored snapshot.
// editor-client is dynamic-imported so this lib never pulls Monaco/Yjs into a
// page bundle statically.

function flushUrl(roomId: string): string {
  return `/api/rooms/${roomId}/snapshot/flush`
}

export function flushWorkspaceSnapshot(roomId: string): void {
  void import('@/components/editor/editor-client')
    .then(({ getYjsStateBytes }) => {
      const bytes = getYjsStateBytes()
      if (!bytes || bytes.length === 0) return
      return fetch(flushUrl(roomId), {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: bytes as unknown as BodyInit,
        keepalive: bytes.length < 60_000,
      })
    })
    .catch(() => undefined)
}

// sendBeacon queues reliably during unload but caps payloads (~64KB); larger
// states rely on the scaffold-time flush + collab-server saves instead
const BEACON_MAX = 60_000

export function registerUnloadFlush(roomId: string): () => void {
  let getBytes: (() => Uint8Array | null) | null = null
  void import('@/components/editor/editor-client')
    .then((mod) => {
      getBytes = mod.getYjsStateBytes
    })
    .catch(() => undefined)

  const onPageHide = () => {
    const bytes = getBytes?.()
    if (!bytes || bytes.length === 0 || bytes.length > BEACON_MAX) return
    navigator.sendBeacon(
      flushUrl(roomId),
      new Blob([bytes as unknown as BlobPart], {
        type: 'application/octet-stream',
      })
    )
  }
  window.addEventListener('pagehide', onPageHide)
  return () => window.removeEventListener('pagehide', onPageHide)
}
