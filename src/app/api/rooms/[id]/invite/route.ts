import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['EDITOR', 'VIEWER']),
})

async function getRoom(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { ownerId: true },
  })
  if (!room) return null
  return { ownerId: room.ownerId, isOwner: room.ownerId === userId }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const room = await getRoom(id, session.user.id)

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  if (!room.isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = inviteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { email, role } = parsed.data

  const target = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true, image: true },
  })

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (target.id === session.user.id) {
    return NextResponse.json(
      { error: 'Cannot invite yourself' },
      { status: 400 }
    )
  }

  const existing = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: id, userId: target.id } },
  })

  if (existing) {
    return NextResponse.json(
      { error: 'User is already a member' },
      { status: 409 }
    )
  }

  const member = await prisma.roomMember.create({
    data: { roomId: id, userId: target.id, role: role as Role },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  })

  return NextResponse.json(member, { status: 201 })
}
