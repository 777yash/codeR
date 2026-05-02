import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { Language } from '@/generated/prisma/client'

const createRoomSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  language: z.nativeEnum(Language).optional(),
  isPublic: z.boolean().optional(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = session.user.id

  const rooms = await prisma.room.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
      _count: { select: { members: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(rooms)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = createRoomSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  const { name, description, language, isPublic } = parsed.data

  const room = await prisma.room.create({
    data: {
      name,
      description,
      language: language ?? 'javascript',
      isPublic: isPublic ?? false,
      ownerId: session.user.id,
      members: {
        create: {
          userId: session.user.id,
          role: 'OWNER',
        },
      },
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
    },
  })

  return NextResponse.json(room, { status: 201 })
}
