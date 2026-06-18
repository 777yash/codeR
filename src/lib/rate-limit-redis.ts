import 'server-only'

const ROOM_LIMIT = 20
const WINDOW_SECONDS = 3600

// Fixed-window counter: the key embeds the hour bucket, so it rotates every
// window and the count is naturally scoped. Refreshing EXPIRE each call only
// affects when the stale key is reaped, never the count.
function bucketKey(roomId: string): { key: string; bucket: number } {
  const bucket = Math.floor(Date.now() / (WINDOW_SECONDS * 1000))
  return { key: `airl:${roomId}:${bucket}`, bucket }
}

// Per-instance fallback when Upstash isn't configured (single instance / demo)
const memory = new Map<string, number>()

function checkMemory(key: string, bucket: number): boolean {
  const count = (memory.get(key) ?? 0) + 1
  memory.set(key, count)
  if (memory.size > 500) {
    const suffix = `:${bucket}`
    for (const k of memory.keys()) if (!k.endsWith(suffix)) memory.delete(k)
  }
  return count <= ROOM_LIMIT
}

/**
 * Allow up to 20 AI actions per room per hour. Uses Upstash Redis (REST, native
 * fetch — no SDK) for cross-instance counting; falls back to an in-memory
 * counter when unconfigured. Fails OPEN on any Redis error — a rate limiter
 * outage must not break the feature, and the per-user in-memory limit in the
 * route still caps burst abuse.
 */
export async function checkRoomAiRateLimit(roomId: string): Promise<boolean> {
  const { key, bucket } = bucketKey(roomId)
  // Read process.env directly (vars are optional) — avoid importing the strict
  // env validator, which would run during `next build` page-data collection
  // and fail when build-time DB/secret vars aren't set.
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return checkMemory(key, bucket)

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, WINDOW_SECONDS],
      ]),
    })
    if (!res.ok) return true
    const data = (await res.json()) as { result?: number }[]
    const count = data[0]?.result ?? 0
    return count <= ROOM_LIMIT
  } catch {
    return true
  }
}
