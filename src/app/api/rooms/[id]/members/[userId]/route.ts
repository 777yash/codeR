import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'
import { verifyCsrfOrigin } from '@/lib/csrf'

const updateSchema = z.object({
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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const csrf = verifyCsrfOrigin(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, userId } = await params
  const room = await getRoom(id, session.user.id)

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  if (!room.isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (userId === room.ownerId) {
    return NextResponse.json(
      { error: "Cannot change owner's role" },
      { status: 400 }
    )
  }

  const body = await req.json()
  const parsed = updateSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const member = await prisma.roomMember.update({
    where: { roomId_userId: { roomId: id, userId } },
    data: { role: parsed.data.role as Role },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
    },
  })

  return NextResponse.json(member)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const csrf = verifyCsrfOrigin(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id, userId } = await params
  const room = await getRoom(id, session.user.id)

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  if (!room.isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (userId === room.ownerId) {
    return NextResponse.json(
      { error: 'Cannot remove room owner' },
      { status: 400 }
    )
  }

  await prisma.roomMember.delete({
    where: { roomId_userId: { roomId: id, userId } },
  })

  return NextResponse.json({ success: true })
}
