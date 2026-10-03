import { createHmac, timingSafeEqual } from 'node:crypto'
import { prisma } from '@/lib/prisma'

export const COLLAB_TICKET_TTL_MS = 5 * 60_000
export type CollabRole = 'OWNER' | 'EDITOR' | 'VIEWER'
type Ticket = {
  roomId: string
  userId: string
  clientId: number
  expiresAt: number
}

function secret(): string {
  const value = process.env.NEXTJS_INTERNAL_SECRET
  if (!value || value.length < 32 || value === 'change-me-to-a-random-secret') {
    throw new Error(
      'NEXTJS_INTERNAL_SECRET must contain at least 32 random characters'
    )
  }
  return value
}

export function validInternalSecret(value: string | null): boolean {
  const expected = Buffer.from(secret())
  const supplied = Buffer.from(value ?? '')
  return (
    supplied.length === expected.length && timingSafeEqual(supplied, expected)
  )
}

function signature(payload: string): Buffer {
  return createHmac('sha256', secret())
    .update(`collab-ticket-v1.${payload}`)
    .digest()
}

export function issueCollabTicket(claims: Ticket): string {
  const payload = Buffer.from(JSON.stringify(claims)).toString('base64url')
  return `${payload}.${signature(payload).toString('base64url')}`
}

export function verifyCollabTicket(
  token: string,
  roomId: string
): Ticket | null {
  if (token.length > 2048) return null
  const parts = token.split('.')
  if (
    parts.length !== 2 ||
    parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))
  )
    return null
  const expected = signature(parts[0])
  const supplied = Buffer.from(parts[1], 'base64url')
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  )
    return null
  try {
    const claims = JSON.parse(
      Buffer.from(parts[0], 'base64url').toString()
    ) as Ticket
    if (
      claims.roomId !== roomId ||
      typeof claims.userId !== 'string' ||
      !claims.userId ||
      !Number.isSafeInteger(claims.clientId) ||
      claims.clientId < 0 ||
      claims.clientId > 0xffffffff ||
      !Number.isSafeInteger(claims.expiresAt) ||
      claims.expiresAt <= Date.now() ||
      claims.expiresAt > Date.now() + COLLAB_TICKET_TTL_MS
    )
      return null
    return claims
  } catch {
    return null
  }
}

// Always consult current database access; a ticket is identity, not a cached role.
export async function getCollabAccess(roomId: string, userId: string) {
  const [room, user] = await Promise.all([
    prisma.room.findUnique({
      where: { id: roomId },
      select: {
        ownerId: true,
        isPublic: true,
        members: { where: { userId }, select: { role: true } },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
  ])
  if (!room || !user) return null
  const role: CollabRole | null =
    room.ownerId === userId
      ? 'OWNER'
      : (room.members[0]?.role ?? (room.isPublic ? 'VIEWER' : null))
  return role ? { role, userId, name: user.name ?? 'Anonymous' } : null
}
