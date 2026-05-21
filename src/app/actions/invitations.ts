'use server'

import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Role } from '@/generated/prisma/client'

export async function respondToInvitation(
  id: string,
  action: 'accept' | 'decline'
) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const invitation = await prisma.invitation.findUnique({ where: { id } })

  if (!invitation) {
    // Already processed — stale UI. Redirect to dashboard cleanly.
    if (action === 'accept') {
      revalidatePath('/dashboard')
      redirect('/dashboard?view=shared')
    }
    return
  }

  if (invitation.inviteeId !== session.user.id) {
    throw new Error('Unauthorized')
  }

  if (action === 'accept') {
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
    revalidatePath('/dashboard')
    redirect('/dashboard?view=shared')
  }

  await prisma.invitation.delete({ where: { id } })
  revalidatePath('/dashboard')
}
