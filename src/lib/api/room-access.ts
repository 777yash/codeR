import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

/**
 * Resolve a user's effective role in a room: 'OWNER' if they own it, their
 * RoomMember role if they're a member, otherwise null (no access).
 */
export async function getUserRoomRole(
  roomId: string,
  userId: string
): Promise<Role | null> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { ownerId: true },
  })
  if (!room) return null
  if (room.ownerId === userId) return 'OWNER'

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true },
  })
  return member?.role ?? null
}
