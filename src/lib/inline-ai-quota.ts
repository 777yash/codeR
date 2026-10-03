import 'server-only'
import { z } from 'zod'
import { redisCommand } from './redis-rest'

// One atomic operation checks both budgets before reserving provider capacity.
// Redis TTL, rather than the serverless process clock, owns the windows.
export const INLINE_AI_QUOTA_SCRIPT = `
local userCount = tonumber(redis.call('GET', KEYS[1]) or '0')
local roomCount = tonumber(redis.call('GET', KEYS[2]) or '0')
if userCount >= tonumber(ARGV[1]) then
  return {0, math.max(1, redis.call('TTL', KEYS[1]))}
end
if roomCount >= tonumber(ARGV[2]) then
  return {0, math.max(1, redis.call('TTL', KEYS[2]))}
end
local userNext = redis.call('INCR', KEYS[1])
if userNext == 1 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end
local roomNext = redis.call('INCR', KEYS[2])
if roomNext == 1 then redis.call('EXPIRE', KEYS[2], ARGV[4]) end
return {1, 0}
`

export async function reserveInlineAiQuota(
  userId: string,
  roomId: string,
  signal: AbortSignal
) {
  const result = z
    .tuple([
      z.union([z.literal(0), z.literal(1)]),
      z.number().int().nonnegative(),
    ])
    .parse(
      await redisCommand(
        [
          'EVAL',
          INLINE_AI_QUOTA_SCRIPT,
          2,
          `coder:inline-ai:user:${encodeURIComponent(userId)}`,
          `coder:inline-ai:room:${encodeURIComponent(roomId)}`,
          30,
          300,
          60,
          3600,
        ],
        signal
      )
    )
  return { allowed: result[0] === 1, retryAfter: result[1] }
}
