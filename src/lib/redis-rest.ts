import 'server-only'
import { z } from 'zod'

const envelope = z.object({ result: z.unknown(), error: z.string().optional() })

/** Shared serverless storage. Never replace a failed shared operation with local state. */
export async function redisCommand(
  command: (string | number)[],
  signal?: AbortSignal
): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim()
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  if (!url || !token) throw new Error('Shared storage is not configured')
  const timeout = AbortSignal.timeout(3000)
  const res = await fetch(url.replace(/\/$/, ''), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  })
  if (!res.ok) throw new Error('Shared storage is unavailable')
  const parsed = envelope.safeParse(await res.json())
  if (!parsed.success || parsed.data.error || parsed.data.result === undefined)
    throw new Error('Invalid shared storage response')
  return parsed.data.result
}
