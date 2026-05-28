import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { canPerform } from '@/lib/room-permissions'
import type { Role } from '@/generated/prisma/client'

async function getUserRoomRole(
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

const createSnapshotSchema = z.object({
  label: z.string().min(1).max(100).optional(),
})

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: roomId } = await params
  const role = await getUserRoomRole(roomId, session.user.id)

  if (!role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const snapshots = await prisma.documentSnapshot.findMany({
    where: { roomId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      label: true,
      createdAt: true,
      createdBy: { select: { name: true, image: true } },
    },
  })

  return NextResponse.json(snapshots)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: roomId } = await params
  const role = await getUserRoomRole(roomId, session.user.id)

  if (!role || !canPerform('edit', role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = createSnapshotSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { contentSnapshot: true },
  })

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  if (!room.contentSnapshot) {
    return NextResponse.json(
      { error: 'No content to snapshot yet' },
      { status: 422 }
    )
  }

  const snapshot = await prisma.documentSnapshot.create({
    data: {
      roomId,
      data: room.contentSnapshot,
      label: parsed.data.label ?? null,
      createdById: session.user.id,
    },
    select: {
      id: true,
      label: true,
      createdAt: true,
      createdBy: { select: { name: true, image: true } },
    },
  })

  return NextResponse.json(snapshot, { status: 201 })
}
