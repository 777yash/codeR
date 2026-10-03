import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANGUAGES } from '@/lib/editor-options'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/csrf', () => ({ verifyCsrfOrigin: vi.fn(() => null) }))
vi.mock('@/lib/api/room-access', () => ({ getUserRoomRole: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: { executionLog: { create: vi.fn(async () => ({})) } },
}))
import { POST } from '@/app/api/execute/route'
import { auth } from '@/auth'
import { getUserRoomRole } from '@/lib/api/room-access'
import { prisma } from '@/lib/prisma'

let userId = 0
function request(body: unknown = {}) {
  return new Request('http://localhost:3000/api/execute', {
    method: 'POST',
    body: JSON.stringify({
      roomId: 'room',
      language: 'go',
      files: [{ name: 'index.go', content: 'package main' }],
      ...(body as object),
    }),
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('ONECOMPILER_RAPIDAPI_KEY', 'test-key')
  vi.mocked(auth).mockResolvedValue({
    user: { id: `execute-${++userId}` },
  } as never)
  vi.mocked(getUserRoomRole).mockResolvedValue('EDITOR')
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => Response.json({ status: 'success', stdout: 'ok' }))
  )
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('POST /api/execute', () => {
  it('normalizes the Go entry filename for single-file execution', async () => {
    const res = await POST(request())
    expect(res.status).toBe(200)
    const payload = JSON.parse(
      vi.mocked(fetch).mock.calls[0][1]!.body as string
    )
    expect(payload.files[0].name).toBe('main.go')
    expect(await res.json()).toMatchObject({
      exitCode: null,
      execStatus: 'completed',
    })
    expect(prisma.executionLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          exitCode: null,
          execStatus: 'completed',
        }),
      })
    )
  })
  it('preserves multi-file Go names', async () => {
    const files = [
      { name: 'main.go', content: 'main' },
      { name: 'helper.go', content: 'helper' },
    ]
    await POST(request({ files }))
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).files
    ).toEqual(files)
  })
  it.each(['main.scala', 'index.scala'])(
    'runs a standard Main object from the default Scala filename %s',
    async (name) => {
      await POST(
        request({
          language: 'scala',
          files: [{ name, content: 'object Main extends App { println(42) }' }],
        })
      )
      expect(
        JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).files[0]
          .name
      ).toBe('Main.scala')
    }
  )
  it('preserves custom Scala object filenames', async () => {
    await POST(
      request({
        language: 'scala',
        files: [
          {
            name: 'Hello.scala',
            content: 'object Hello extends App { println(42) }',
          },
        ],
      })
    )
    expect(
      JSON.parse(vi.mocked(fetch).mock.calls[0][1]!.body as string).files[0]
        .name
    ).toBe('Hello.scala')
  })
  it.each(LANGUAGES.map((l) => l.value))(
    'accepts the advertised language %s',
    async (language) => {
      expect((await POST(request({ language }))).status).toBe(200)
    }
  )
  it.each([null, 'VIEWER'] as const)(
    'denies remote execution for role %s',
    async (role) => {
      vi.mocked(getUserRoomRole).mockResolvedValue(role)
      expect((await POST(request())).status).toBe(403)
      expect(fetch).not.toHaveBeenCalled()
    }
  )
  it('rejects malformed request JSON without crashing', async () => {
    expect(
      (
        await POST(
          new Request('http://localhost:3000/api/execute', {
            method: 'POST',
            body: '{',
          })
        )
      ).status
    ).toBe(400)
    expect(fetch).not.toHaveBeenCalled()
  })
  it.each([
    { status: 'failed' },
    { status: 'success', error: 'quota exceeded' },
    { unexpected: true },
  ])('rejects failed or invalid provider payloads %j', async (result) => {
    vi.mocked(fetch).mockResolvedValue(Response.json(result))
    expect((await POST(request())).status).toBe(502)
    expect(prisma.executionLog.create).not.toHaveBeenCalled()
  })
  it('handles non-JSON provider responses', async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response('<html>upstream failure</html>')
    )
    expect((await POST(request())).status).toBe(502)
  })
  it('maps provider timeout errors to HTTP 408', async () => {
    vi.mocked(fetch).mockResolvedValue(
      Response.json({ status: 'failed', error: 'execution timed out' })
    )
    expect((await POST(request())).status).toBe(408)
  })
})
