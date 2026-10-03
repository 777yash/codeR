import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/auth', () => ({ auth: vi.fn() }))
vi.mock('@/lib/prisma', () => ({
  prisma: { room: { findUnique: vi.fn() }, user: { findUnique: vi.fn() } },
}))

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { POST as issue } from '@/app/api/rooms/[id]/collab/route'
import { POST as authorize } from '@/app/api/rooms/[id]/collab/authorize/route'
import { issueCollabTicket, verifyCollabTicket } from '@/lib/collab-auth'

const secret = 'test-secret-with-at-least-32-characters'
const params = Promise.resolve({ id: 'room' })
const request = (body: unknown, headers: Record<string, string> = {}) =>
  new Request('http://localhost:3000/api/rooms/room/collab', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json', ...headers },
  })
const claims = () => ({
  roomId: 'room',
  userId: 'user',
  clientId: 123,
  expiresAt: Date.now() + 60_000,
})
const member = (role: 'EDITOR' | 'VIEWER', isPublic = false) => {
  vi.mocked(prisma.room.findUnique).mockResolvedValue({
    ownerId: 'owner',
    isPublic,
    members: [{ role }],
  } as never)
}

beforeEach(() => {
  vi.stubEnv('NEXTJS_INTERNAL_SECRET', secret)
  vi.stubEnv('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
  vi.mocked(auth).mockResolvedValue({
    user: { id: 'user' },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as never)
  vi.mocked(prisma.user.findUnique).mockResolvedValue({
    name: 'Authenticated User',
  } as never)
  member('EDITOR')
})

describe('room tickets', () => {
  it('issues a bounded ticket for the authenticated user and selected room', async () => {
    const response = await issue(
      request({ clientId: 123, userId: 'owner', role: 'OWNER' }),
      { params }
    )
    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('no-store')
    const body = await response.json()
    expect(body.role).toBe('EDITOR')
    expect(verifyCollabTicket(body.token, 'room')).toMatchObject({
      roomId: 'room',
      userId: 'user',
      clientId: 123,
    })
    expect(body.expiresAt).toBeLessThanOrEqual(Date.now() + 300_000)
  })
  it('does not let tickets outlive the session', async () => {
    const expiresAt = Date.now() + 30_000
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user' },
      expires: new Date(expiresAt).toISOString(),
    } as never)
    expect(
      (await (await issue(request({ clientId: 1 }), { params })).json())
        .expiresAt
    ).toBe(expiresAt)
  })
  it('rejects anonymous users, deleted users and expired sessions', async () => {
    vi.mocked(auth).mockResolvedValue(null as never)
    expect((await issue(request({ clientId: 1 }), { params })).status).toBe(401)
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'user' },
      expires: new Date(0).toISOString(),
    } as never)
    expect((await issue(request({ clientId: 1 }), { params })).status).toBe(401)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)
    expect((await issue(request({ clientId: 1 }), { params })).status).toBe(403)
  })
  it('rejects private nonmembers, permits public visitors only as viewers and identifies owners', async () => {
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: 'owner',
      isPublic: false,
      members: [],
    } as never)
    expect((await issue(request({ clientId: 1 }), { params })).status).toBe(403)
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: 'owner',
      isPublic: true,
      members: [],
    } as never)
    expect(
      (await (await issue(request({ clientId: 1 }), { params })).json()).role
    ).toBe('VIEWER')
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: 'user',
      isPublic: false,
      members: [],
    } as never)
    expect(
      (await (await issue(request({ clientId: 1 }), { params })).json()).role
    ).toBe('OWNER')
  })
  it('rejects invalid client IDs and cross-origin calls even with a supplied internal header', async () => {
    for (const clientId of [-1, 2 ** 32, '123', null, 1.5]) {
      expect((await issue(request({ clientId }), { params })).status).toBe(400)
    }
    expect(
      (
        await issue(
          request(
            { clientId: 1 },
            { origin: 'https://evil.example', 'x-internal-secret': secret }
          ),
          { params }
        )
      ).status
    ).toBe(403)
  })
  it('rejects tampering, wrong rooms, expired, malformed and overlong tickets', () => {
    const token = issueCollabTicket(claims())
    expect(verifyCollabTicket(token, 'room')).not.toBeNull()
    for (const invalid of [
      token + 'x',
      'bad.token',
      'a'.repeat(2049),
      issueCollabTicket({ ...claims(), expiresAt: Date.now() - 1 }),
      issueCollabTicket({ ...claims(), expiresAt: Date.now() + 600_000 }),
    ]) {
      expect(verifyCollabTicket(invalid, 'room')).toBeNull()
    }
    expect(verifyCollabTicket(token, 'another-room')).toBeNull()
    vi.stubEnv(
      'NEXTJS_INTERNAL_SECRET',
      'another-secret-with-at-least-32-characters'
    )
    expect(verifyCollabTicket(token, 'room')).toBeNull()
    vi.stubEnv('NEXTJS_INTERNAL_SECRET', '')
    expect(() => issueCollabTicket(claims())).toThrow()
  })
})

describe('internal live authorization', () => {
  it('requires the internal secret and a valid room-bound ticket', async () => {
    const token = issueCollabTicket(claims())
    expect((await authorize(request({ token }), { params })).status).toBe(401)
    expect(
      (
        await authorize(request({ token }, { 'x-internal-secret': 'wrong' }), {
          params,
        })
      ).status
    ).toBe(401)
    expect(
      (
        await authorize(request({ token }, { 'x-internal-secret': secret }), {
          params: Promise.resolve({ id: 'other' }),
        })
      ).status
    ).toBe(401)
  })
  it('recomputes roles and rejects revoked access or deleted rooms using the same ticket', async () => {
    const token = issueCollabTicket(claims())
    const check = () =>
      authorize(request({ token }, { 'x-internal-secret': secret }), { params })
    expect(await (await check()).json()).toMatchObject({
      userId: 'user',
      role: 'EDITOR',
      clientId: 123,
    })
    member('VIEWER')
    expect(await (await check()).json()).toMatchObject({ role: 'VIEWER' })
    vi.mocked(prisma.room.findUnique).mockResolvedValue({
      ownerId: 'owner',
      isPublic: false,
      members: [],
    } as never)
    expect((await check()).status).toBe(403)
    vi.mocked(prisma.room.findUnique).mockResolvedValue(null)
    expect((await check()).status).toBe(403)
  })
})
