import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PATCH, DELETE } from '@/app/api/rooms/[id]/members/[userId]/route'

const ROOM_ID = 'cmooqutf5000410vuxazwpcis'
const OWNER_ID = 'owner_test_user_id'
const MEMBER_ID = 'member_test_user_id'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    room: { findUnique: vi.fn() },
    roomMember: { update: vi.fn(), delete: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

const params = Promise.resolve({ id: ROOM_ID, userId: MEMBER_ID })
const ownerParams = Promise.resolve({ id: ROOM_ID, userId: OWNER_ID })

function makePatch(body: unknown) {
  return new Request(
    `http://localhost/api/rooms/${ROOM_ID}/members/${MEMBER_ID}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  )
}

function makeDelete() {
  return new Request(
    `http://localhost/api/rooms/${ROOM_ID}/members/${MEMBER_ID}`,
    {
      method: 'DELETE',
    }
  )
}

describe('PATCH /api/rooms/[id]/members/[userId]', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ user: { id: OWNER_ID } } as never)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const res = await PATCH(makePatch({ role: 'VIEWER' }), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when room not found', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null)
    const res = await PATCH(makePatch({ role: 'VIEWER' }), { params })
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not owner', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: 'someone_else',
    } as never)
    const res = await PATCH(makePatch({ role: 'VIEWER' }), { params })
    expect(res.status).toBe(403)
  })

  it('returns 400 when trying to change owner role', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    const res = await PATCH(makePatch({ role: 'VIEWER' }), {
      params: ownerParams,
    })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({
      error: "Cannot change owner's role",
    })
  })

  it('returns 400 when role is invalid', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    const res = await PATCH(makePatch({ role: 'OWNER' }), { params })
    expect(res.status).toBe(400)
  })

  it('updates member role and returns updated member', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    vi.mocked(prisma.roomMember.update).mockResolvedValue({
      id: 'member_record_id',
      roomId: ROOM_ID,
      userId: MEMBER_ID,
      role: 'VIEWER',
      joinedAt: new Date(),
      user: {
        id: MEMBER_ID,
        name: 'Member',
        email: 'member@example.com',
        image: null,
      },
    } as never)

    const res = await PATCH(makePatch({ role: 'VIEWER' }), { params })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      role: 'VIEWER',
      userId: MEMBER_ID,
    })
    expect(vi.mocked(prisma.roomMember.update)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { roomId_userId: { roomId: ROOM_ID, userId: MEMBER_ID } },
        data: { role: 'VIEWER' },
      })
    )
  })
})

describe('DELETE /api/rooms/[id]/members/[userId]', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ user: { id: OWNER_ID } } as never)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const res = await DELETE(makeDelete(), { params })
    expect(res.status).toBe(401)
  })

  it('returns 404 when room not found', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null)
    const res = await DELETE(makeDelete(), { params })
    expect(res.status).toBe(404)
  })

  it('returns 403 when caller is not owner', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: 'someone_else',
    } as never)
    const res = await DELETE(makeDelete(), { params })
    expect(res.status).toBe(403)
  })

  it('returns 400 when trying to remove the room owner', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    const res = await DELETE(makeDelete(), { params: ownerParams })
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({
      error: 'Cannot remove room owner',
    })
  })

  it('removes member and returns success', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    vi.mocked(prisma.roomMember.delete).mockResolvedValue({} as never)

    const res = await DELETE(makeDelete(), { params })
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ success: true })
    expect(vi.mocked(prisma.roomMember.delete)).toHaveBeenCalledWith({
      where: { roomId_userId: { roomId: ROOM_ID, userId: MEMBER_ID } },
    })
  })
})
