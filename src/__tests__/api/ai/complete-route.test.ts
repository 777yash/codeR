import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('server-only', () => ({}))
vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/csrf', () => ({ verifyCsrfOrigin: vi.fn(() => null) }))
vi.mock('@/lib/api/room-access', () => ({ getUserRoomRole: vi.fn() }))
vi.mock('@/lib/prisma', () => ({ prisma: { room: { findUnique: vi.fn() } } }))
vi.mock('@/lib/inline-ai-quota', () => ({ reserveInlineAiQuota: vi.fn() }))

import { POST } from '@/app/api/ai/complete/route'
import { auth } from '@/auth'
import { verifyCsrfOrigin } from '@/lib/csrf'
import { getUserRoomRole } from '@/lib/api/room-access'
import { prisma } from '@/lib/prisma'
import { reserveInlineAiQuota } from '@/lib/inline-ai-quota'

const valid = {
  roomId: 'r1',
  filename: 'src/main.js',
  prefix: 'const a = ',
  suffix: '',
  language: 'javascript',
}
function request(body: unknown = valid, signal?: AbortSignal) {
  return new NextRequest('http://localhost/api/ai/complete', {
    method: 'POST',
    body: JSON.stringify(body),
    signal,
  })
}

beforeEach(() => {
  vi.stubEnv('CODESTRAL_API_KEY', 'private-test-key')
  vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never)
  vi.mocked(getUserRoomRole).mockResolvedValue('EDITOR')
  vi.mocked(prisma.room.findUnique).mockResolvedValue({
    aiChatEnabled: true,
  } as never)
  vi.mocked(reserveInlineAiQuota).mockResolvedValue({
    allowed: true,
    retryAfter: 0,
  })
  vi.mocked(verifyCsrfOrigin).mockReturnValue(null)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ choices: [{ text: '42' }] }))
  )
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('bounded and authorized inline completions', () => {
  it('requires authentication and CSRF before any paid request', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    expect((await POST(request())).status).toBe(401)
    vi.mocked(verifyCsrfOrigin).mockReturnValue(
      Response.json({}, { status: 403 }) as never
    )
    expect((await POST(request())).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
    expect(reserveInlineAiQuota).not.toHaveBeenCalled()
  })
  it.each([null, 'VIEWER'] as const)(
    'rejects nonediting role %s',
    async (role) => {
      vi.mocked(getUserRoomRole).mockResolvedValue(role)
      expect((await POST(request())).status).toBe(403)
      expect(fetch).not.toHaveBeenCalled()
      expect(reserveInlineAiQuota).not.toHaveBeenCalled()
    }
  )
  it('enforces room AI policy', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      aiChatEnabled: false,
    } as never)
    expect((await POST(request())).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each([
    { ...valid, prefix: 2 },
    { ...valid, suffix: null },
    { ...valid, roomId: '' },
    { ...valid, filename: '' },
    { ...valid, language: {} },
    { ...valid, prefix: 'a'.repeat(16001) },
    { ...valid, suffix: 'a'.repeat(8001) },
    { ...valid, otherFiles: [{ name: 'x', content: 'a'.repeat(8001) }] },
    {
      ...valid,
      otherFiles: Array.from({ length: 4 }, () => ({ name: 'x', content: '' })),
    },
    { ...valid, otherFiles: [{ name: 'x', content: null }] },
  ])('rejects invalid types and individual bounds', async (body) => {
    expect((await POST(request(body))).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('contains malformed JSON', async () => {
    const req = new NextRequest('http://localhost/api/ai/complete', {
      method: 'POST',
      body: '{',
    })
    expect((await POST(req)).status).toBe(400)
  })
  it('bounds an oversized body without Content-Length', async () => {
    const req = request({ ...valid, extra: 'x'.repeat(129 * 1024) })
    expect(req.headers.has('content-length')).toBe(false)
    expect((await POST(req)).status).toBe(413)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('rejects declared oversized bodies', async () => {
    const req = request()
    req.headers.set('content-length', '200000')
    expect((await POST(req)).status).toBe(413)
  })
  it.each(['.env.local', 'src\\credentials.json', 'private.key'])(
    'rejects active sensitive file %s',
    async (filename) => {
      expect((await POST(request({ ...valid, filename }))).status).toBe(403)
      expect(fetch).not.toHaveBeenCalled()
    }
  )
  it('filters sensitive context and preserves allowed context and suffix', async () => {
    const res = await POST(
      request({
        ...valid,
        suffix: ';',
        otherFiles: [
          { name: '.env', content: 'VERY_PRIVATE' },
          { name: 'lib.js', content: 'export const b=1' },
        ],
      })
    )
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ completion: '42' })
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://codestral.mistral.ai/v1/fim/completions')
    const body = JSON.parse(init!.body as string)
    expect(body.prompt).not.toContain('VERY_PRIVATE')
    expect(body.prompt).toContain('export const b=1')
    expect(body.suffix).toBe(';')
    expect(body.max_tokens).toBe(128)
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(reserveInlineAiQuota).toHaveBeenCalledWith(
      'u1',
      'r1',
      expect.any(AbortSignal)
    )
  })
  it('returns Retry-After and never contacts the provider when quota is exhausted', async () => {
    vi.mocked(reserveInlineAiQuota).mockResolvedValue({
      allowed: false,
      retryAfter: 37,
    })
    const res = await POST(request())
    expect(res.status).toBe(429)
    expect(res.headers.get('retry-after')).toBe('37')
    expect(fetch).not.toHaveBeenCalled()
  })
  it('fails closed when shared quotas are unavailable', async () => {
    vi.mocked(reserveInlineAiQuota).mockRejectedValue(
      new Error('Redis unavailable')
    )
    expect((await POST(request())).status).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('does not reserve quota without a provider key', async () => {
    vi.stubEnv('CODESTRAL_API_KEY', '')
    expect((await POST(request())).status).toBe(503)
    expect(reserveInlineAiQuota).not.toHaveBeenCalled()
  })
  it('contains upstream HTTP and network errors', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('private-provider-details', { status: 500 })
    )
    const res = await POST(request())
    expect(res.status).toBe(502)
    expect(await res.text()).not.toContain('private-provider-details')
    vi.mocked(fetch).mockRejectedValue(new Error('Network down'))
    expect((await POST(request())).status).toBe(502)
  })
  it.each([{}, { choices: [] }, { choices: [{ text: 4 }] }])(
    'contains malformed upstream envelopes',
    async (value) => {
      vi.mocked(fetch).mockResolvedValue(Response.json(value))
      expect((await POST(request())).status).toBe(502)
    }
  )
  it('rejects oversized provider responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ choices: [{ text: 'x'.repeat(70000) }] })
    )
    expect((await POST(request())).status).toBe(502)
  })
  it('does not contact provider for an already cancelled request', async () => {
    const controller = new AbortController()
    controller.abort()
    expect((await POST(request(valid, controller.signal))).status).toBe(499)
    expect(reserveInlineAiQuota).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
  it('cancels upstream work when the client disconnects', async () => {
    const controller = new AbortController()
    vi.mocked(fetch).mockImplementation(async (_url, init) => {
      controller.abort()
      expect(init!.signal!.aborted).toBe(true)
      throw new DOMException('Aborted', 'AbortError')
    })
    expect((await POST(request(valid, controller.signal))).status).toBe(499)
  })
  it('uses an eight-second provider deadline and contains its timeout', async () => {
    const deadline = new AbortController()
    const timeout = vi
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(deadline.signal)
    vi.mocked(fetch).mockImplementation(async () => {
      deadline.abort(new DOMException('Timeout', 'TimeoutError'))
      throw deadline.signal.reason
    })
    expect((await POST(request())).status).toBe(504)
    expect(timeout).toHaveBeenCalledWith(8000)
  })
})
