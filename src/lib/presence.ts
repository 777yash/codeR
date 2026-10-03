import 'server-only'
import { z } from 'zod'
import { redisCommand } from './redis-rest'

// Use Redis's clock so instances with different local clocks agree on expiry.
export const PRESENCE_SCRIPT = `
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now)
redis.call('ZADD', KEYS[1], now + 30000, ARGV[1])
redis.call('EXPIRE', KEYS[1], 60)
return redis.call('ZRANGE', KEYS[1], 0, -1)
`

export async function heartbeatPresence(
  roomId: string,
  userId: string,
  signal: AbortSignal
) {
  return z
    .array(z.string().min(1))
    .parse(
      await redisCommand(
        [
          'EVAL',
          PRESENCE_SCRIPT,
          1,
          `coder:presence:${encodeURIComponent(roomId)}`,
          userId,
        ],
        signal
      )
    )
}
