import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/csrf', () => ({ verifyCsrfOrigin: vi.fn(() => null) }))
vi.mock('@/lib/api/room-access', () => ({ getUserRoomRole: vi.fn() }))
vi.mock('@/lib/rate-limit-redis', () => ({
  checkRoomAiRateLimit: vi.fn(async () => true),
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    room: { findUnique: vi.fn(async () => ({ aiChatEnabled: true })) },
    aiActionLog: { create: vi.fn(async () => ({})) },
  },
}))

import { POST, parseAiResponse } from '@/app/api/ai/scaffold/route'
import { auth } from '@/auth'
import { getUserRoomRole } from '@/lib/api/room-access'
import { checkRoomAiRateLimit } from '@/lib/rate-limit-redis'
import { prisma } from '@/lib/prisma'

const ORIGINAL_TOKEN = process.env.GITHUB_MODELS_TOKEN

const okScaffold = {
  mode: 'scaffold',
  text: 'ok',
  files: [{ filename: 'index.js', contents: 'console.log(1)' }],
  buildCommand: { mainItem: 'npm', commands: ['install'] },
  startCommand: { mainItem: 'npm', commands: ['run', 'dev'] },
  actions: [],
}

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/ai/scaffold', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId: 'r1', ...body }),
  })
}

function asUser(id: string) {
  vi.mocked(auth).mockResolvedValue({ user: { id } } as never)
}

function mockFetch(impl: () => unknown) {
  global.fetch = vi.fn(async () => impl() as Response) as never
}

beforeEach(() => {
  process.env.GITHUB_MODELS_TOKEN = 'test-token'
  vi.mocked(getUserRoomRole).mockResolvedValue('OWNER')
  vi.mocked(checkRoomAiRateLimit).mockResolvedValue(true)
  vi.mocked(prisma.room.findUnique).mockResolvedValue({
    aiChatEnabled: true,
  } as never)
  mockFetch(() => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: { content: JSON.stringify(okScaffold) },
          finish_reason: 'stop',
        },
      ],
    }),
  }))
})

afterAll(() => {
  process.env.GITHUB_MODELS_TOKEN = ORIGINAL_TOKEN
})

describe('POST /api/ai/scaffold', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const res = await POST(makeReq({ prompt: 'hi' }))
    expect(res.status).toBe(401)
  })

  it('returns 503 when no token is configured', async () => {
    asUser('u-503')
    delete process.env.GITHUB_MODELS_TOKEN
    const res = await POST(makeReq({ prompt: 'build an app' }))
    expect(res.status).toBe(503)
  })

  it('returns 400 on an invalid body', async () => {
    asUser('u-400')
    const res = await POST(makeReq({ prompt: '' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when roomId is missing', async () => {
    asUser('u-noroom')
    const req = new NextRequest('http://localhost/api/ai/scaffold', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'build an app' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 403 when the caller is not a room member', async () => {
    asUser('u-stranger')
    vi.mocked(getUserRoomRole).mockResolvedValue(null)
    const res = await POST(makeReq({ prompt: 'build an app' }))
    expect(res.status).toBe(403)
  })

  it('returns 403 for a VIEWER', async () => {
    asUser('u-viewer')
    vi.mocked(getUserRoomRole).mockResolvedValue('VIEWER')
    const res = await POST(makeReq({ prompt: 'build an app' }))
    expect(res.status).toBe(403)
  })

  it('returns 403 when AI is disabled for the room', async () => {
    asUser('u-disabled')
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      aiChatEnabled: false,
    } as never)
    const res = await POST(makeReq({ prompt: 'build an app' }))
    expect(res.status).toBe(403)
  })

  it('returns 429 once the per-room limit is exceeded', async () => {
    asUser('u-roomlimit')
    vi.mocked(checkRoomAiRateLimit).mockResolvedValue(false)
    const res = await POST(makeReq({ prompt: 'build an app' }))
    expect(res.status).toBe(429)
  })

  it('returns 502 when the upstream call fails', async () => {
    asUser('u-502')
    mockFetch(() => ({ ok: false, status: 401, text: async () => 'bad token' }))
    const res = await POST(makeReq({ prompt: 'build an app' }))
    expect(res.status).toBe(502)
    expect(await res.json()).toMatchObject({
      details: expect.stringContaining('401'),
    })
  })

  it('returns 429 once the per-user limit is exceeded', async () => {
    asUser('u-429')
    for (let i = 0; i < 10; i++) {
      await POST(makeReq({ prompt: 'build an app' }))
    }
    const res = await POST(makeReq({ prompt: 'build an app' }))
    expect(res.status).toBe(429)
  })

  it('returns the parsed scaffold on success', async () => {
    asUser('u-ok')
    const res = await POST(makeReq({ prompt: 'build an app' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ files: okScaffold.files })
  })

  it('audit-logs @ai chat actions (source=chat) but not panel calls', async () => {
    asUser('u-log')
    await POST(makeReq({ prompt: 'build an app', source: 'chat' }))
    expect(prisma.aiActionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ roomId: 'r1', actionType: 'scaffold' }),
      })
    )

    vi.mocked(prisma.aiActionLog.create).mockClear()
    await POST(makeReq({ prompt: 'build an app', source: 'panel' }))
    expect(prisma.aiActionLog.create).not.toHaveBeenCalled()
  })
})

describe('parseAiResponse', () => {
  it('parses clean JSON', () => {
    expect(parseAiResponse('{"a":1}')).toEqual({ a: 1 })
  })
  it('parses a ```json fenced block', () => {
    expect(parseAiResponse('```json\n{"a":1}\n```')).toEqual({ a: 1 })
  })
  it('extracts the first..last brace span from noise', () => {
    expect(parseAiResponse('prefix {"a":1} suffix')).toEqual({ a: 1 })
  })
  it('returns null on garbage', () => {
    expect(parseAiResponse('not json at all')).toBeNull()
  })
})
