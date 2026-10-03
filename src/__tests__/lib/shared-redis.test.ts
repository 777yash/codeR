import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))
import { redisCommand } from '@/lib/redis-rest'
import { reserveInlineAiQuota } from '@/lib/inline-ai-quota'
import { heartbeatPresence } from '@/lib/presence'

beforeEach(() => {
  vi.stubEnv('UPSTASH_REDIS_REST_URL', 'https://redis.example.test/')
  vi.stubEnv('UPSTASH_REDIS_REST_TOKEN', 'private-redis-key')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ result: [1, 0] }))
  )
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('shared quotas and expiring presence transport', () => {
  it('uses an atomic reservation and keeps the per-user budget shared across rooms', async () => {
    await reserveInlineAiQuota(
      'same-user',
      'room-a',
      new AbortController().signal
    )
    await reserveInlineAiQuota(
      'same-user',
      'room-b',
      new AbortController().signal
    )
    const commands = vi
      .mocked(fetch)
      .mock.calls.map(([, init]) => JSON.parse(init!.body as string))
    expect(commands[0][0]).toBe('EVAL')
    expect(commands[0][2]).toBe(2)
    expect(commands[0][3]).toBe(commands[1][3])
    expect(commands[0][4]).not.toBe(commands[1][4])
    expect(commands[0].slice(5)).toEqual([30, 300, 60, 3600])
  })
  it('propagates Redis quota denial and its retry interval', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ result: [0, 3599] }))
    expect(
      await reserveInlineAiQuota('user', 'room', new AbortController().signal)
    ).toEqual({ allowed: false, retryAfter: 3599 })
  })
  it('does not treat malformed quota results as permission to spend', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ result: [2, -1] }))
    await expect(
      reserveInlineAiQuota('user', 'room', new AbortController().signal)
    ).rejects.toThrow()
  })
  it.each([{ error: 'ERR script failed' }, { result: null, error: 'ERR' }, {}])(
    'rejects unsuccessful Redis envelopes',
    async (body) => {
      vi.mocked(fetch).mockResolvedValue(Response.json(body))
      await expect(redisCommand(['PING'])).rejects.toThrow()
    }
  )
  it('fails closed without configured storage', async () => {
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '')
    await expect(
      heartbeatPresence('room', 'user', new AbortController().signal)
    ).rejects.toThrow('not configured')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('contains HTTP failures and network errors', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('private-error', { status: 503 })
    )
    await expect(redisCommand(['PING'])).rejects.toThrow('unavailable')
    vi.mocked(fetch).mockRejectedValue(new Error('connection failure'))
    await expect(redisCommand(['PING'])).rejects.toThrow()
  })
  it('sends bearer credentials without URL tokens and uses a bounded uncached request', async () => {
    const timeout = vi.spyOn(AbortSignal, 'timeout')
    await redisCommand(['PING'])
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://redis.example.test')
    expect(init!.headers).toMatchObject({
      Authorization: 'Bearer private-redis-key',
    })
    expect(init!.cache).toBe('no-store')
    expect(init!.signal).toBeInstanceOf(AbortSignal)
    expect(timeout).toHaveBeenCalledWith(3000)
  })
  it('propagates caller cancellation through shared storage requests', async () => {
    const controller = new AbortController()
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      controller.abort()
      expect(init!.signal!.aborted).toBe(true)
      throw new DOMException('Aborted', 'AbortError')
    })
    await expect(redisCommand(['PING'], controller.signal)).rejects.toThrow()
  })
  it('uses a shared per-room key and returns backend identities instead of local identities', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ result: ['remote-user', 'local-user'] })
    )
    const ids = await heartbeatPresence(
      'room',
      'local-user',
      new AbortController().signal
    )
    expect(ids).toEqual(['remote-user', 'local-user'])
    const command = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]!.body as string
    )
    expect(command[0]).toBe('EVAL')
    expect(command.slice(2)).toEqual([1, 'coder:presence:room', 'local-user'])
  })
  it('rejects malformed presence identities', async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ result: ['user', 4] }))
    await expect(
      heartbeatPresence('room', 'user', new AbortController().signal)
    ).rejects.toThrow()
  })
})
