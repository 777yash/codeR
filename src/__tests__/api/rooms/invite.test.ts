import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/rooms/[id]/invite/route'

const ROOM_ID = 'cmooqutf5000410vuxazwpcis'
const OWNER_ID = 'owner_test_user_id'
const TARGET_ID = 'target_test_user_id'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    room: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    roomMember: { findUnique: vi.fn(), create: vi.fn() },
    invitation: { upsert: vi.fn() },
  },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

function makeRequest(body: unknown) {
  return new Request(`http://localhost/api/rooms/${ROOM_ID}/invite`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const params = Promise.resolve({ id: ROOM_ID })

describe('POST /api/rooms/[id]/invite', () => {
  beforeEach(() => {
    vi.mocked(auth).mockResolvedValue({ user: { id: OWNER_ID } } as never)
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    const res = await POST(makeRequest({ email: 'a@b.com', role: 'EDITOR' }), {
      params,
    })
    expect(res.status).toBe(401)
  })

  it('returns 404 when room does not exist', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null)
    const res = await POST(makeRequest({ email: 'a@b.com', role: 'EDITOR' }), {
      params,
    })
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'Room not found' })
  })

  it('returns 403 when caller is not owner', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: 'someone_else',
    } as never)
    const res = await POST(makeRequest({ email: 'a@b.com', role: 'EDITOR' }), {
      params,
    })
    expect(res.status).toBe(403)
  })

  it('returns 400 when email is invalid', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    const res = await POST(
      makeRequest({ email: 'not-an-email', role: 'EDITOR' }),
      { params }
    )
    expect(res.status).toBe(400)
  })

  it('returns 400 when role is invalid', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    const res = await POST(makeRequest({ email: 'a@b.com', role: 'OWNER' }), {
      params,
    })
    expect(res.status).toBe(400)
  })

  it('returns 404 when target user not found', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    const res = await POST(
      makeRequest({ email: 'ghost@example.com', role: 'EDITOR' }),
      { params }
    )
    expect(res.status).toBe(404)
    expect(await res.json()).toMatchObject({ error: 'User not found' })
  })

  it('returns 409 when user is already a member', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: TARGET_ID,
      name: 'Test',
      email: 'test@example.com',
      image: null,
    } as never)
    vi.mocked(prisma.roomMember.findUnique).mockResolvedValue({
      id: 'existing',
    } as never)
    const res = await POST(
      makeRequest({ email: 'test@example.com', role: 'EDITOR' }),
      { params }
    )
    expect(res.status).toBe(409)
    expect(await res.json()).toMatchObject({
      error: 'User is already a member',
    })
  })

  it('returns 400 when owner invites themselves', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: OWNER_ID,
      name: 'Owner',
      email: 'owner@example.com',
      image: null,
    } as never)
    const res = await POST(
      makeRequest({ email: 'owner@example.com', role: 'EDITOR' }),
      { params }
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ error: 'Cannot invite yourself' })
  })

  it('returns 201 and invitation on success', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: OWNER_ID,
    } as never)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      id: TARGET_ID,
      name: 'Target',
      email: 'target@example.com',
      image: null,
    } as never)
    vi.mocked(prisma.roomMember.findUnique).mockResolvedValue(null)
    vi.mocked(prisma.invitation.upsert).mockResolvedValue({
      id: 'new_invitation_id',
      roomId: ROOM_ID,
      inviterId: OWNER_ID,
      inviteeId: TARGET_ID,
      role: 'EDITOR',
      createdAt: new Date(),
      inviter: {
        id: OWNER_ID,
        name: 'Owner',
        email: 'owner@example.com',
        image: null,
      },
      invitee: {
        id: TARGET_ID,
        name: 'Target',
        email: 'target@example.com',
        image: null,
      },
    } as never)

    const res = await POST(
      makeRequest({ email: 'target@example.com', role: 'EDITOR' }),
      { params }
    )
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body).toMatchObject({ role: 'EDITOR', inviteeId: TARGET_ID })
  })
})
