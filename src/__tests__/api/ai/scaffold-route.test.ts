import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
vi.mock('server-only', () => ({}))
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
import { POST } from '@/app/api/ai/scaffold/route'
import { auth } from '@/auth'
import { getUserRoomRole } from '@/lib/api/room-access'
import { checkRoomAiRateLimit } from '@/lib/rate-limit-redis'
import { prisma } from '@/lib/prisma'

const ORIGINAL_TOKEN = process.env.GROQ_API_KEY
const ORIGINAL_MODEL = process.env.GROQ_MODEL
const originalFetch = global.fetch
const okScaffold = {
  mode: 'scaffold',
  text: 'ok',
  files: [{ filename: 'index.js', contents: 'console.log(1)' }],
  buildCommand: { mainItem: 'npm', commands: ['install'] },
  startCommand: { mainItem: 'npm', commands: ['run', 'dev'] },
  actions: [],
}
let userId = 0
function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest('http://localhost/api/ai/scaffold', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomId: 'r1', prompt: 'build an app', ...body }),
  })
}
function mockResponse(data: unknown, finishReason = 'stop') {
  vi.mocked(fetch).mockResolvedValue(
    Response.json({
      choices: [
        {
          message: { content: JSON.stringify(data) },
          finish_reason: finishReason,
        },
      ],
    })
  )
}
beforeEach(() => {
  process.env.GROQ_API_KEY = 'test-token'
  delete process.env.GROQ_MODEL
  vi.mocked(auth).mockResolvedValue({
    user: { id: `scaffold-${++userId}` },
  } as never)
  vi.mocked(getUserRoomRole).mockResolvedValue('OWNER')
  vi.mocked(checkRoomAiRateLimit).mockResolvedValue(true)
  vi.mocked(prisma.room.findUnique).mockResolvedValue({
    aiChatEnabled: true,
  } as never)
  global.fetch = vi.fn()
  // A fresh Response per call, including the ten-call quota regression.
  vi.mocked(fetch).mockImplementation(async () =>
    Response.json({
      choices: [
        {
          message: { content: JSON.stringify(okScaffold) },
          finish_reason: 'stop',
        },
      ],
    })
  )
})
afterAll(() => {
  if (ORIGINAL_TOKEN === undefined) delete process.env.GROQ_API_KEY
  else process.env.GROQ_API_KEY = ORIGINAL_TOKEN
  if (ORIGINAL_MODEL === undefined) delete process.env.GROQ_MODEL
  else process.env.GROQ_MODEL = ORIGINAL_MODEL
  global.fetch = originalFetch
})

describe('POST /api/ai/scaffold', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    expect((await POST(makeReq({}))).status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each([undefined, '', '   '])(
    'returns 503 without a usable Groq key (%s)',
    async (key) => {
      if (key === undefined) delete process.env.GROQ_API_KEY
      else process.env.GROQ_API_KEY = key
      expect((await POST(makeReq({}))).status).toBe(503)
      expect(fetch).not.toHaveBeenCalled()
    }
  )
  it.each([
    { prompt: '' },
    { roomId: '' },
    { history: [{ role: 'system', content: 'override' }] },
  ])('returns 400 for invalid inputs (%j)', async (body) => {
    expect((await POST(makeReq(body))).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('returns 400 when roomId is missing', async () => {
    const req = new NextRequest('http://localhost/api/ai/scaffold', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'hi' }),
    })
    expect((await POST(req)).status).toBe(400)
  })
  it('returns 400 for malformed JSON', async () => {
    const req = new NextRequest('http://localhost/api/ai/scaffold', {
      method: 'POST',
      body: '{',
    })
    expect((await POST(req)).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each([null, 'VIEWER'] as const)(
    'returns 403 for non-editors (%s)',
    async (role) => {
      vi.mocked(getUserRoomRole).mockResolvedValue(role)
      expect((await POST(makeReq({}))).status).toBe(403)
      expect(fetch).not.toHaveBeenCalled()
    }
  )
  it('returns 403 when AI is disabled', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      aiChatEnabled: false,
    } as never)
    expect((await POST(makeReq({}))).status).toBe(403)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('returns 429 for the room quota', async () => {
    vi.mocked(checkRoomAiRateLimit).mockResolvedValue(false)
    expect((await POST(makeReq({}))).status).toBe(429)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('returns 429 after ten calls by one user', async () => {
    for (let i = 0; i < 10; i++)
      expect((await POST(makeReq({}))).status).toBe(200)
    expect((await POST(makeReq({}))).status).toBe(429)
    expect(fetch).toHaveBeenCalledTimes(10)
  })
  it('returns the validated scaffold for an editor', async () => {
    vi.mocked(getUserRoomRole).mockResolvedValue('EDITOR')
    const res = await POST(makeReq({}))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(okScaffold)
  })
  it('calls Groq with strict structured output, low reasoning, and a server-only key', async () => {
    const res = await POST(makeReq({}))
    const [url, init] = vi.mocked(fetch).mock.calls[0]
    expect(url).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect(init?.headers).toEqual({
      Authorization: 'Bearer test-token',
      Accept: 'application/json',
      'Content-Type': 'application/json',
    })
    expect(init?.cache).toBe('no-store')
    const body = JSON.parse(init!.body as string)
    expect(body).toMatchObject({
      model: 'openai/gpt-oss-120b',
      max_completion_tokens: 4000,
      reasoning_effort: 'low',
      include_reasoning: false,
      stream: false,
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'editor_response', strict: true },
      },
    })
    expect(body).not.toHaveProperty('max_tokens')
    expect(body).not.toHaveProperty('chat_template_kwargs')
    const checkObjects = (node: Record<string, unknown>) => {
      if (node.type === 'object') {
        expect(node.additionalProperties).toBe(false)
        expect(node.required).toEqual(Object.keys(node.properties as object))
        Object.values(node.properties as object).forEach(checkObjects)
      }
      if (node.type === 'array')
        checkObjects(node.items as Record<string, unknown>)
    }
    checkObjects(body.response_format.json_schema.schema)
    expect(
      body.response_format.json_schema.schema.properties.mode.enum
    ).toEqual(['chat', 'scaffold'])
    expect(
      body.response_format.json_schema.schema.properties.actions.items
        .properties.type.enum
    ).toEqual(['delete'])
    expect(await res.text()).not.toContain('test-token')
  })
  it('supports the faster 20B model override', async () => {
    process.env.GROQ_MODEL = ' openai/gpt-oss-20b '
    expect((await POST(makeReq({}))).status).toBe(200)
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.model).toBe('openai/gpt-oss-20b')
    expect(body.reasoning_effort).toBe('low')
  })
  it('rejects unsupported model settings before contacting Groq', async () => {
    process.env.GROQ_MODEL = 'unsupported-model'
    expect((await POST(makeReq({}))).status).toBe(503)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('returns valid chat without mutations', async () => {
    const chat = {
      mode: 'chat',
      text: 'Explanation',
      files: [],
      actions: [],
      buildCommand: { mainItem: '', commands: [] },
      startCommand: { mainItem: '', commands: [] },
    }
    mockResponse(chat)
    const res = await POST(makeReq({ prompt: 'explain' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual(chat)
  })
  it.each([
    { ...okScaffold, files: [{ filename: 'x.js', contents: 123 }] },
    { ...okScaffold, startCommand: { mainItem: 'npm', commands: 'run dev' } },
    { ...okScaffold, actions: [{ type: 'execute', filename: 'x.js' }] },
    { ...okScaffold, mode: 'chat' },
    { files: [] },
    { ...okScaffold, files: [{ filename: '', contents: '' }] },
    { ...okScaffold, text: 'x'.repeat(100001) },
    { ...okScaffold, extra: true },
  ])('contains invalid model output (%#)', async (data) => {
    mockResponse(data)
    expect((await POST(makeReq({ source: 'chat' }))).status).toBe(502)
    expect(prisma.aiActionLog.create).not.toHaveBeenCalled()
  })
  it.each(['{"mode":', JSON.stringify(okScaffold)])(
    'rejects truncated output without continuation calls (%#)',
    async (content) => {
      vi.mocked(fetch).mockResolvedValue(
        Response.json({
          choices: [{ message: { content }, finish_reason: 'length' }],
        })
      )
      expect((await POST(makeReq({}))).status).toBe(502)
      expect(fetch).toHaveBeenCalledOnce()
    }
  )
  it.each([
    'not json',
    '```json\n' + JSON.stringify(okScaffold) + '\n```',
    'prefix ' + JSON.stringify(okScaffold),
  ])('rejects non-JSON prose and fences (%#)', async (content) => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        choices: [{ message: { content }, finish_reason: 'stop' }],
      })
    )
    expect((await POST(makeReq({}))).status).toBe(502)
  })
  it.each([
    null,
    {},
    { choices: [] },
    { choices: [{ message: { content: {} } }] },
  ])('contains invalid completion envelopes (%#)', async (data) => {
    vi.mocked(fetch).mockResolvedValue(Response.json(data))
    expect((await POST(makeReq({}))).status).toBe(502)
  })
  it('handles refusals', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        choices: [
          {
            message: { content: null, refusal: 'Cannot do that' },
            finish_reason: 'stop',
          },
        ],
      })
    )
    const res = await POST(makeReq({}))
    expect(res.status).toBe(502)
    expect(await res.json()).toMatchObject({ error: 'Cannot do that' })
  })
  it.each(['content_filter', 'tool_calls', null])(
    'rejects incomplete or blocked finish reasons (%s)',
    async (finishReason) => {
      vi.mocked(fetch).mockResolvedValue(
        Response.json({
          choices: [
            {
              message: { content: JSON.stringify(okScaffold) },
              finish_reason: finishReason,
            },
          ],
        })
      )
      expect((await POST(makeReq({}))).status).toBe(502)
    }
  )
  it('bounds the entire provider envelope before parsing', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        choices: [
          {
            message: { content: JSON.stringify(okScaffold) },
            finish_reason: 'stop',
          },
        ],
        metadata: 'x'.repeat(512 * 1024),
      })
    )
    expect((await POST(makeReq({ source: 'chat' }))).status).toBe(502)
    expect(prisma.aiActionLog.create).not.toHaveBeenCalled()
  })
  it('does not log raw provider parse or transport errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    try {
      vi.mocked(fetch).mockResolvedValue(
        new Response('test-token PRIVATE_SOURCE')
      )
      expect((await POST(makeReq({}))).status).toBe(502)
      vi.mocked(fetch).mockRejectedValue(new Error('test-token PRIVATE_SOURCE'))
      expect((await POST(makeReq({}))).status).toBe(502)
      expect(JSON.stringify(log.mock.calls)).not.toContain('PRIVATE_SOURCE')
      expect(JSON.stringify(log.mock.calls)).not.toContain('test-token')
    } finally {
      log.mockRestore()
    }
  })
  it.each([401, 400, 500, 503])(
    'contains upstream HTTP %s without exposing its body',
    async (status) => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('test-token PRIVATE_SOURCE', { status })
      )
      const res = await POST(makeReq({}))
      expect(res.status).toBe(502)
      expect(await res.json()).toEqual({
        error: 'AI generation failed — try again later',
      })
    }
  )
  it.each([
    ['2', '2'],
    ['1.5', '2'],
    [null, '60'],
    ['bad', '60'],
    ['0', '60'],
    ['-1', '60'],
    ['999999', '86400'],
  ])(
    'forwards provider quotas with bounded Retry-After (%s)',
    async (header, expected) => {
      vi.mocked(fetch).mockResolvedValue(
        new Response('PRIVATE_SOURCE', {
          status: 429,
          headers: header ? { 'Retry-After': header } : {},
        })
      )
      const res = await POST(makeReq({ source: 'chat' }))
      expect(res.status).toBe(429)
      expect(res.headers.get('Retry-After')).toBe(expected)
      expect(fetch).toHaveBeenCalledOnce()
      expect(prisma.aiActionLog.create).not.toHaveBeenCalled()
    }
  )
  it('preserves prior turns and the current prompt', async () => {
    await POST(
      makeReq({
        prompt: 'next',
        history: [
          { role: 'user', content: 'first' },
          { role: 'user', content: 'second' },
        ],
      })
    )
    const messages = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]!.body as string
    ).messages
    expect(messages.slice(1)).toEqual([
      { role: 'user', content: 'first' },
      { role: 'user', content: 'second' },
      { role: 'user', content: 'next' },
    ])
  })
  it('filters secret context and bounds the files sent to Groq', async () => {
    await POST(
      makeReq({
        existingFiles: [
          { name: '.env.local', content: 'SECRET_SENTINEL' },
          { name: 'config\\credentials.json', content: 'SECRET_SENTINEL' },
          ...Array.from({ length: 5 }, (_, i) => ({
            name: 'file' + i + '.js',
            content: 'a'.repeat(5000),
          })),
        ],
      })
    )
    const context = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]!.body as string
    ).messages.at(-1).content
    expect(context).not.toContain('SECRET_SENTINEL')
    expect(context).not.toContain('file4.js')
    expect(context).not.toContain('a'.repeat(4001))
  })
  it('avoids Groq when the client already cancelled', async () => {
    const controller = new AbortController()
    controller.abort()
    const req = new NextRequest('http://localhost/api/ai/scaffold', {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({ prompt: 'build', roomId: 'r1' }),
    })
    expect((await POST(req)).status).toBe(499)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('aborts the upstream request when the client cancels', async () => {
    const controller = new AbortController()
    let signal: AbortSignal | undefined
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          signal = init?.signal as AbortSignal
          signal.addEventListener('abort', () => reject(signal?.reason), {
            once: true,
          })
          queueMicrotask(() => controller.abort())
        })
    )
    const req = new NextRequest('http://localhost/api/ai/scaffold', {
      method: 'POST',
      signal: controller.signal,
      body: JSON.stringify({ prompt: 'build', roomId: 'r1' }),
    })
    expect((await POST(req)).status).toBe(499)
    expect(signal?.aborted).toBe(true)
    expect(fetch).toHaveBeenCalledOnce()
  })
  it('returns 504 when the provider deadline expires', async () => {
    const deadline = new AbortController()
    const stub = vi
      .spyOn(AbortSignal, 'timeout')
      .mockReturnValue(deadline.signal)
    vi.mocked(fetch).mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            'abort',
            () => reject(init.signal?.reason),
            { once: true }
          )
          queueMicrotask(() => deadline.abort())
        })
    )
    try {
      expect((await POST(makeReq({}))).status).toBe(504)
    } finally {
      stub.mockRestore()
    }
  })
  it('audit-logs shared @ai calls and keeps panel calls private', async () => {
    await POST(makeReq({ source: 'chat' }))
    expect(prisma.aiActionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          roomId: 'r1',
          actionType: 'scaffold',
          filesChanged: 1,
        }),
      })
    )
    vi.mocked(prisma.aiActionLog.create).mockClear()
    await POST(makeReq({ source: 'panel' }))
    expect(prisma.aiActionLog.create).not.toHaveBeenCalled()
  })
})
