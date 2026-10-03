import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/csrf', () => ({ verifyCsrfOrigin: vi.fn(() => null) }))
vi.mock('@/lib/collab-auth', () => ({ getCollabAccess: vi.fn() }))
vi.mock('@/lib/presence', () => ({ heartbeatPresence: vi.fn() }))
import { POST } from '@/app/api/rooms/[id]/presence/route'
import { auth } from '@/auth'
import { getCollabAccess } from '@/lib/collab-auth'
import { heartbeatPresence } from '@/lib/presence'

const req = () =>
  new Request('http://localhost/api/rooms/r1/presence', { method: 'POST' })
const params = { params: Promise.resolve({ id: 'r1' }) }
beforeEach(() => {
  vi.mocked(auth).mockResolvedValue({ user: { id: 'u1' } } as never)
  vi.mocked(getCollabAccess).mockResolvedValue({
    userId: 'u1',
    name: 'User',
    role: 'VIEWER',
  })
  vi.mocked(heartbeatPresence).mockResolvedValue(['u1', 'u2'])
})
describe('authorized shared presence', () => {
  it('rejects unauthenticated requests', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    expect((await POST(req(), params)).status).toBe(401)
    expect(heartbeatPresence).not.toHaveBeenCalled()
  })
  it('rejects private nonmembers, removed users and missing rooms before accessing shared state', async () => {
    vi.mocked(getCollabAccess).mockResolvedValue(null)
    expect((await POST(req(), params)).status).toBe(403)
    expect(getCollabAccess).toHaveBeenCalledWith('r1', 'u1')
    expect(heartbeatPresence).not.toHaveBeenCalled()
  })
  it('allows authorized viewers including public nonmembers without caching their identities', async () => {
    const res = await POST(req(), params)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ onlineIds: ['u1', 'u2'] })
    expect(res.headers.get('cache-control')).toBe('private, no-store')
    expect(heartbeatPresence).toHaveBeenCalledWith(
      'r1',
      'u1',
      expect.any(AbortSignal)
    )
  })
  it('reports shared storage failures without a fabricated local presence list', async () => {
    vi.mocked(heartbeatPresence).mockRejectedValue(
      new Error('secret-redis-details')
    )
    const res = await POST(req(), params)
    expect(res.status).toBe(503)
    expect(await res.text()).not.toContain('secret-redis-details')
  })
})
