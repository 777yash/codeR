import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST, DELETE } from '@/app/api/rooms/[id]/share/route'

const ROOM_ID = 'cmooqutf5000410vuxazwpcis'
const OWNER_ID = 'owner_test_user_id'
const TOKEN = 'share_token_abc123'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    room: { findUnique: vi.fn() },
    shareLink: { create: vi.fn(), deleteMany: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const params = Promise.resolve({ id: ROOM_ID })

function makeRequest(body: unknown, method: string) {
  return new Request(`http://localhost/api/rooms/${ROOM_ID}/share`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/rooms/[id]/share', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ user: { id: OWNER_ID } } as never)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const res = await POST(makeRequest({ role: 'VIEWER' }, 'POST'), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when room not found', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null)
    const res = await POST(makeRequest({ role: 'VIEWER' }, 'POST'), { params })
    expect(res.status).toBe(404)
  })

  it('returns 403 when not owner', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: 'someone_else',
    } as never)
    const res = await POST(makeRequest({ role: 'VIEWER' }, 'POST'), { params })
    expect(res.status).toBe(403)
  })

  it('returns 400 when role is invalid', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    const res = await POST(makeRequest({ role: 'OWNER' }, 'POST'), { params })
    expect(res.status).toBe(400)
  })

  it('creates link with VIEWER role by default', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    vi.mocked(prisma.shareLink.create).mockResolvedValue({
      id: 'link_id',
      token: TOKEN,
      role: 'VIEWER',
      expiresAt: null,
      createdAt: new Date(),
    } as never)

    const res = await POST(makeRequest({}, 'POST'), { params })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({ token: TOKEN, role: 'VIEWER' })
    expect(vi.mocked(prisma.shareLink.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ role: 'VIEWER', roomId: ROOM_ID }),
      })
    )
  })

  it('creates link with EDITOR role when specified', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    vi.mocked(prisma.shareLink.create).mockResolvedValue({
      id: 'link_id',
      token: TOKEN,
      role: 'EDITOR',
      expiresAt: null,
      createdAt: new Date(),
    } as never)

    const res = await POST(makeRequest({ role: 'EDITOR' }, 'POST'), { params })
    expect(res.status).toBe(201)
    expect(await res.json()).toMatchObject({ role: 'EDITOR' })
  })
})

describe('DELETE /api/rooms/[id]/share', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ user: { id: OWNER_ID } } as never)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const res = await DELETE(makeRequest({ token: TOKEN }, 'DELETE'), {
      params,
    })
    expect(res.status).toBe(401)
  })

  it('returns 403 when not owner', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: 'someone_else',
    } as never)
    const res = await DELETE(makeRequest({ token: TOKEN }, 'DELETE'), {
      params,
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 when token is missing', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    const res = await DELETE(makeRequest({}, 'DELETE'), { params })
    expect(res.status).toBe(400)
  })

  it('deletes link and returns success', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    vi.mocked(prisma.shareLink.deleteMany).mockResolvedValue({
      count: 1,
    } as never)

    const res = await DELETE(makeRequest({ token: TOKEN }, 'DELETE'), {
      params,
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true })
    expect(vi.mocked(prisma.shareLink.deleteMany)).toHaveBeenCalledWith({
      where: { token: TOKEN, roomId: ROOM_ID },
    })
  })
})
