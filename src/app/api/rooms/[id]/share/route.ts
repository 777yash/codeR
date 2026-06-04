import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'
import { verifyCsrfOrigin } from '@/lib/csrf'

const createSchema = z.object({
  role: z.enum(['VIEWER', 'EDITOR']).default('VIEWER'),
  expiresAt: z.string().datetime().optional(),
})

const deleteSchema = z.object({
  token: z.string().min(1),
})

async function getRoom(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: {
      ownerId: true,
      members: { where: { userId }, select: { role: true } },
    },
  })
  if (!room) return null
  const isOwner = room.ownerId === userId
  const memberRole = room.members[0]?.role ?? null
  return { isOwner, canShare: isOwner || memberRole === 'EDITOR' }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = verifyCsrfOrigin(req)
  if (csrf) return csrf

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const room = await getRoom(id, session.user.id)

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  if (!room.canShare) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { role, expiresAt } = parsed.data

  const link = await prisma.shareLink.create({
    data: {
      roomId: id,
      role: role as Role,
      ...(expiresAt && { expiresAt: new Date(expiresAt) }),
    },
    select: {
      id: true,
      token: true,
      role: true,
      expiresAt: true,
      createdAt: true,
    },
  })

  return NextResponse.json(link, { status: 201 })
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = verifyCsrfOrigin(req)
  if (csrf) return csrf

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
  const parsed = deleteSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  await prisma.shareLink.deleteMany({
    where: { token: parsed.data.token, roomId: id },
  })

  return NextResponse.json({ success: true })
}
