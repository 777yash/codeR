import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { verifyCsrfOrigin } from '@/lib/csrf'
import { canPerform } from '@/lib/room-permissions'
import { getUserRoomRole } from '@/lib/api/room-access'
import type { Language } from '@/generated/prisma/client'

const updateDocumentSchema = z.object({
  content: z.string().max(500000).optional(),
  language: z.string().optional(),
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
  const role = await getUserRoomRole(id, session.user.id)

  if (!role) {
    const room = await prisma.room.findUnique({ where: { id: id } })
    if (!room || !room.isPublic) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }
    return NextResponse.json({ content: room.content, language: room.language })
  }

  const room = await prisma.room.findUnique({
    where: { id },
    select: { content: true, language: true },
  })

  if (!room) {
    return NextResponse.json({ error: 'Room not found' }, { status: 404 })
  }

  return NextResponse.json({ content: room.content, language: room.language })
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
  const parsed = updateDocumentSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const room = await prisma.room.update({
    where: { id },
    data: {
      content: parsed.data.content,
      ...(parsed.data.language && {
        language: parsed.data.language as Language,
      }),
    },
    select: { content: true, language: true },
  })

  return NextResponse.json(room)
}
