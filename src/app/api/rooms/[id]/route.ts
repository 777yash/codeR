import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { canPerform } from '@/lib/room-permissions'
import type { Language } from '@/generated/prisma/client'

const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  language: z.string().optional(),
  isPublic: z.boolean().optional(),
})

async function getUserRoomRole(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { ownerId: true },
  })

  if (!room) return null
  if (room.ownerId === userId) return 'OWNER' as const

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
    select: { role: true },
  })

  return member?.role ?? null
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const userId = session.user.id

  const room = await prisma.room.findUnique({
    where: { id },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
      shareLinks: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          id: true,
          token: true,
          role: true,
          expiresAt: true,
          createdAt: true,
        },
      },
    },
  })

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  if (room.ownerId === userId) {
    return NextResponse.json({ ...room, userRole: 'OWNER' })
  }

  const member = room.members.find((m) => m.userId === userId)
  if (member) {
    return NextResponse.json({ ...room, userRole: member.role })
  }

  if (room.isPublic) {
    const {
      members: _members,
      shareLinks: _shareLinks,
      owner: _owner,
      ...publicRoom
    } = room
    return NextResponse.json({ ...publicRoom, role: 'PUBLIC' })
  }

  return NextResponse.json({ error: 'Room not found' }, { status: 404 })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const role = await getUserRoomRole(id, session.user.id)

  if (!role || !canPerform('edit', role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateRoomSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { language, ...rest } = parsed.data

  const room = await prisma.room.update({
    where: { id },
    data: {
      ...rest,
      ...(language && { language: language as Language }),
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
    },
  })

  return NextResponse.json(room)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const role = await getUserRoomRole(id, session.user.id)

  if (!role || !canPerform('delete', role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.room.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
