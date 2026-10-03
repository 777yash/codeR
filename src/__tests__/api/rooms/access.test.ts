import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    room: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    roomMember: { findUnique: vi.fn() },
    shareLink: { findMany: vi.fn() },
  },
}))
vi.mock('@/lib/collab-revocation', () => ({
  notifyCollabAccessChanged: vi.fn(),
}))
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { notifyCollabAccessChanged } from '@/lib/collab-revocation'
import { GET, PATCH } from '@/app/api/rooms/[id]/route'

const params = Promise.resolve({ id: 'room' })
const link = {
  id: 'link',
  token: 'secret-editor-invitation',
  role: 'EDITOR',
  expiresAt: null,
}
const req = (body?: unknown) =>
  new Request(
    'http://localhost:3000/api/rooms/room',
    body === undefined
      ? {}
      : {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
  )
function role(value: 'OWNER' | 'EDITOR' | 'VIEWER' | null, isPublic = false) {
  vi.mocked(prisma.room.findUnique).mockResolvedValue({
    id: 'room',
    name: 'Project',
    language: 'javascript',
    description: null,
    ownerId: value === 'OWNER' ? 'user' : 'owner',
    isPublic,
    owner: { id: 'owner', name: 'Owner' },
    members:
      value && value !== 'OWNER' ? [{ userId: 'user', role: value }] : [],
    snapshot: 'internal-snapshot',
  } as never)
  vi.mocked(prisma.roomMember.findUnique).mockResolvedValue(
    value ? ({ role: value } as never) : null
  )
}
beforeEach(() => {
  vi.mocked(auth).mockResolvedValue({ user: { id: 'user' } } as never)
  vi.mocked(prisma.shareLink.findMany).mockResolvedValue([link] as never)
  vi.mocked(prisma.room.update).mockResolvedValue({ id: 'room' } as never)
  role('OWNER')
})

describe('room visibility', () => {
  it.each([true, false])(
    'allows owners to set visibility to %s and invalidates live access',
    async (isPublic) => {
      expect((await PATCH(req({ isPublic }), { params })).status).toBe(200)
      expect(prisma.room.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isPublic }) })
      )
      expect(notifyCollabAccessChanged).toHaveBeenCalledWith('room')
    }
  )
  it.each([true, false])(
    'rejects editor visibility changes (%s), including mixed updates',
    async (isPublic) => {
      role('EDITOR')
      expect(
        (await PATCH(req({ name: 'Changed', isPublic }), { params })).status
      ).toBe(403)
      expect(prisma.room.update).not.toHaveBeenCalled()
      expect(notifyCollabAccessChanged).not.toHaveBeenCalled()
    }
  )
  it('still permits editors to edit ordinary room fields', async () => {
    role('EDITOR')
    expect(
      (
        await PATCH(
          req({
            name: 'Changed',
            description: 'Description',
            language: 'python',
          }),
          { params }
        )
      ).status
    ).toBe(200)
    expect(prisma.room.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          name: 'Changed',
          description: 'Description',
          language: 'python',
        },
      })
    )
    expect(notifyCollabAccessChanged).not.toHaveBeenCalled()
  })
  it.each(['VIEWER', null] as const)('rejects writes by %s', async (value) => {
    role(value)
    expect((await PATCH(req({ name: 'Changed' }), { params })).status).toBe(403)
    expect(prisma.room.update).not.toHaveBeenCalled()
  })
})

describe('invitation credential exposure', () => {
  it.each(['OWNER', 'EDITOR'] as const)(
    'returns active share links to authorized %s users',
    async (value) => {
      role(value)
      const response = await GET(req(), { params })
      expect(response.headers.get('cache-control')).toBe('private, no-store')
      expect(await response.json()).toMatchObject({
        userRole: value,
        shareLinks: [link],
      })
      expect(prisma.shareLink.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ roomId: 'room' }),
        })
      )
    }
  )
  it('does not query or return reusable tokens to viewers', async () => {
    role('VIEWER')
    const response = await GET(req(), { params })
    expect(await response.json()).toMatchObject({
      userRole: 'VIEWER',
      shareLinks: [],
    })
    expect(prisma.shareLink.findMany).not.toHaveBeenCalled()
    expect(prisma.room.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.not.objectContaining({ shareLinks: expect.anything() }),
      })
    )
  })
  it('returns only public room fields and viewer permissions to public nonmembers', async () => {
    role(null, true)
    const response = await GET(req(), { params })
    const body = await response.json()
    expect(body).toMatchObject({ id: 'room', userRole: 'VIEWER' })
    for (const field of ['members', 'shareLinks', 'owner', 'snapshot'])
      expect(body).not.toHaveProperty(field)
    expect(prisma.shareLink.findMany).not.toHaveBeenCalled()
  })
  it('hides private rooms from nonmembers', async () => {
    role(null)
    expect((await GET(req(), { params })).status).toBe(404)
    expect(prisma.shareLink.findMany).not.toHaveBeenCalled()
  })
  it('rechecks the current role on each request after a downgrade', async () => {
    role('EDITOR')
    expect(
      (await (await GET(req(), { params })).json()).shareLinks
    ).toHaveLength(1)
    role('VIEWER')
    expect((await (await GET(req(), { params })).json()).shareLinks).toEqual([])
    expect(prisma.shareLink.findMany).toHaveBeenCalledTimes(1)
  })
  it('requires authentication and rejects missing rooms', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    expect((await GET(req(), { params })).status).toBe(401)
    expect((await PATCH(req({ isPublic: true }), { params })).status).toBe(401)
    vi.mocked(auth).mockResolvedValue({ user: { id: 'user' } } as never)
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null)
    expect((await GET(req(), { params })).status).toBe(404)
  })
})
