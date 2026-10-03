import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/csrf', () => ({ verifyCsrfOrigin: vi.fn(() => null) }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    room: { findUnique: vi.fn() },
    account: { findFirst: vi.fn() },
  },
}))
import { POST } from '@/app/api/rooms/[id]/gist/route'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyCsrfOrigin } from '@/lib/csrf'
import { prepareGistFiles } from '@/lib/gist-files'

const params = { params: Promise.resolve({ id: 'room' }) }
const files = [{ name: 'src/main.js', content: 'console.log(42)' }]
const request = (body: unknown = { files, isPublic: false }) =>
  new Request('http://localhost:3000/api/rooms/room/gist', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(auth).mockResolvedValue({ user: { id: 'owner' } } as never)
  vi.mocked(prisma.room.findUnique).mockResolvedValue({
    ownerId: 'owner',
    isPublic: false,
    members: [],
  } as never)
  vi.mocked(prisma.account.findFirst).mockResolvedValue({
    access_token: 'server-only-token',
    scope: 'read:user,user:email,gist',
  } as never)
  vi.stubGlobal(
    'fetch',
    vi.fn(async () =>
      Response.json(
        { html_url: 'https://gist.github.com/test/abc123' },
        { status: 201 }
      )
    )
  )
})
afterEach(() => vi.unstubAllGlobals())

describe('Gist export', () => {
  it('flattens nested paths without collisions or losing content/extensions', async () => {
    const files = [
      { name: 'src/main.js', content: 'nested' },
      { name: 'src%2Fmain.js', content: 'literal' },
      { name: '__proto__', content: 'safe' },
      { name: 'gistfile1', content: 'reserved' },
      { name: 'empty.js', content: '  ' },
    ]
    const res = await POST(request({ files, isPublic: false }), params)
    expect(res.status).toBe(201)
    const body = JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string)
    expect(body.files).toEqual({
      'src%2Fmain.js': { content: 'nested' },
      'src%252Fmain.js': { content: 'literal' },
      ['__proto__']: { content: 'safe' },
      'export-gistfile1': { content: 'reserved' },
    })
    expect(Object.keys(body.files)).toContain('__proto__')
    expect(body.public).toBe(false)
    expect(await res.json()).toEqual({
      url: 'https://gist.github.com/test/abc123',
    })
  })
  it('rejects duplicate paths rather than silently losing files', () => {
    expect(() =>
      prepareGistFiles([
        { name: 'src/a.js', content: 'a' },
        { name: 'src\\a.js', content: 'b' },
      ])
    ).toThrow(/unique/)
  })
  it.each([
    '{',
    { files: [], isPublic: false },
    { files: [{ name: 'bad\u0000.js', content: 'a' }], isPublic: false },
    { files: [{ name: 'empty.js', content: ' ' }], isPublic: false },
  ])('rejects malformed or empty input %j', async (body) => {
    expect((await POST(request(body), params)).status).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('requires authentication', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    expect((await POST(request(), params)).status).toBe(401)
    expect(fetch).not.toHaveBeenCalled()
  })
  it('denies private rooms to nonmembers before reading GitHub credentials', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: 'other',
      isPublic: false,
      members: [],
    } as never)
    expect((await POST(request(), params)).status).toBe(403)
    expect(prisma.account.findFirst).not.toHaveBeenCalled()
  })
  it('rejects cross-origin mutations', async () => {
    vi.mocked(verifyCsrfOrigin).mockReturnValueOnce(
      Response.json({}, { status: 403 }) as never
    )
    expect((await POST(request(), params)).status).toBe(403)
  })
  it.each([null, { access_token: 'token', scope: 'read:user' }])(
    'offers reconnect for missing credentials/scopes',
    async (account) => {
      vi.mocked(prisma.account.findFirst).mockResolvedValue(account as never)
      const res = await POST(request(), params)
      expect(res.status).toBe(409)
      expect(await res.json()).toMatchObject({ code: 'GITHUB_RECONNECT' })
      expect(fetch).not.toHaveBeenCalled()
    }
  )
  it('offers reconnect when GitHub revokes a token', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 401 }))
    const res = await POST(request(), params)
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({ code: 'GITHUB_RECONNECT' })
  })
  it.each([
    null,
    { html_url: 'javascript:alert(1)' },
    { html_url: 'https://evil.example/gist' },
  ])('contains invalid GitHub responses %j', async (body) => {
    vi.mocked(fetch).mockResolvedValueOnce(Response.json(body))
    expect((await POST(request(), params)).status).toBe(502)
  })
  it('contains upstream network failures and bounds request duration', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('timeout'))
    expect((await POST(request(), params)).status).toBe(502)
    expect(vi.mocked(fetch).mock.calls[0][1]!.signal).toBeInstanceOf(
      AbortSignal
    )
  })
})
