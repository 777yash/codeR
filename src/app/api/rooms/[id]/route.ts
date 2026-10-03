import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { canPerform } from '@/lib/room-permissions'
import { getUserRoomRole } from '@/lib/api/room-access'
import { verifyCsrfOrigin } from '@/lib/csrf'
import { notifyCollabAccessChanged } from '@/lib/collab-revocation'
import type { Language } from '@/generated/prisma/client'

const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  language: z.string().optional(),
  isPublic: z.boolean().optional(),
  aiChatEnabled: z.boolean().optional(),
})

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
    },
  })

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  const member = room.members.find((m) => m.userId === userId)
  const role = room.ownerId === userId ? 'OWNER' : member?.role
  if (role) {
    // Fetch invitation credentials only after checking sharing permission.
    const shareLinks = canPerform('share', role)
      ? await prisma.shareLink.findMany({
          where: {
            roomId: id,
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          },
          select: {
            id: true,
            token: true,
            role: true,
            expiresAt: true,
            createdAt: true,
          },
        })
      : []
    return NextResponse.json(
      { ...room, shareLinks, userRole: role },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  if (room.isPublic) {
    return NextResponse.json(
      {
        id: room.id,
        name: room.name,
        description: room.description,
        language: room.language,
        isPublic: room.isPublic,
        aiChatEnabled: room.aiChatEnabled,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        userRole: 'VIEWER',
      },
      { headers: { 'Cache-Control': 'private, no-store' } }
    )
  }

  return NextResponse.json({ error: 'Room not found' }, { status: 404 })
}

export async function PATCH(
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
  const role = await getUserRoomRole(id, session.user.id)

  if (!role || !canPerform('edit', role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const parsed = updateRoomSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  if (parsed.data.isPublic !== undefined && !canPerform('manage', role)) {
    return NextResponse.json(
      { error: 'Only the room owner can change visibility' },
      { status: 403 }
    )
  }

  const { language, aiChatEnabled, isPublic, ...rest } = parsed.data

  const room = await prisma.room.update({
    where: { id },
    data: {
      ...rest,
      ...(isPublic !== undefined && { isPublic }),
      ...(language && { language: language as Language }),
      // Owner-only: editors can change name/description/language but not the
      // room's AI policy.
      ...(aiChatEnabled !== undefined && role === 'OWNER' && { aiChatEnabled }),
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
    },
  })

  if (parsed.data.isPublic !== undefined) await notifyCollabAccessChanged(id)
  return NextResponse.json(room)
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
  const role = await getUserRoomRole(id, session.user.id)

  if (!role || !canPerform('delete', role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.room.delete({ where: { id } })
  await notifyCollabAccessChanged(id)

  return NextResponse.json({ success: true })
}
