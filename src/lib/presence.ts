const TIMEOUT_MS = 30_000

interface Entry {
  expiresAt: number
}

// roomId → userId → Entry
const store = new Map<string, Map<string, Entry>>()

export function markPresent(roomId: string, userId: string): void {
  let room = store.get(roomId)
  if (!room) {
    room = new Map()
    store.set(roomId, room)
  }
  room.set(userId, { expiresAt: Date.now() + TIMEOUT_MS })
}

export function getOnlineUserIds(roomId: string): string[] {
  const room = store.get(roomId)
  if (!room) return []
  const now = Date.now()
  const online: string[] = []
  for (const [userId, entry] of room.entries()) {
    if (entry.expiresAt > now) {
      online.push(userId)
    } else {
      room.delete(userId)
    }
  }
  return online
}
