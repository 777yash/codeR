import { NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import type { Role } from '@/generated/prisma/client'

const schema = z.object({ action: z.enum(['accept', 'decline']) })

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const invitation = await prisma.invitation.findUnique({ where: { id } })

  if (!invitation || invitation.inviteeId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (parsed.data.action === 'accept') {
    await prisma.$transaction([
      prisma.roomMember.upsert({
        where: {
          roomId_userId: {
            roomId: invitation.roomId,
            userId: invitation.inviteeId,
          },
        },
        create: {
          roomId: invitation.roomId,
          userId: invitation.inviteeId,
          role: invitation.role as Role,
        },
        update: { role: invitation.role as Role },
      }),
      prisma.invitation.delete({ where: { id } }),
    ])
    return NextResponse.json({ success: true, roomId: invitation.roomId })
  }

  await prisma.invitation.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
