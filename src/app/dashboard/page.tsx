import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import type { Metadata } from 'next'
import { RoomList } from '@/components/rooms/room-list'
import { CollabWarmup } from '@/components/collab-warmup'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export const metadata: Metadata = {
  title: 'Dashboard — codeR',
}

async function handleSignOut() {
  'use server'
  const { signOut } = await import('@/auth')
  await signOut({ redirectTo: '/' })
}

const include = {
  owner: { select: { id: true, name: true, image: true } },
  members: {
    include: { user: { select: { id: true, name: true, image: true } } },
  },
  _count: { select: { members: true } },
} as const

async function getRooms(userId: string, view: string) {
  const orderBy = { updatedAt: 'desc' as const }
  switch (view) {
    case 'shared':
      return prisma.room.findMany({
        where: { members: { some: { userId } }, ownerId: { not: userId } },
        include,
        orderBy,
      })
    case 'recent':
      return prisma.room.findMany({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
        include,
        orderBy,
        take: 10,
      })
    case 'starred':
    default:
      return prisma.room.findMany({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
        include,
        orderBy,
      })
  }
}

const viewMeta: Record<string, { title: string; subtitle: string }> = {
  'my-rooms': {
    title: 'My Rooms',
    subtitle: 'Rooms you own or collaborate in',
  },
  shared: { title: 'Shared With Me', subtitle: 'Rooms others invited you to' },
  recent: { title: 'Recent', subtitle: 'Last 10 rooms you accessed' },
  starred: { title: 'Starred', subtitle: 'Rooms you starred' },
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  const { view = 'my-rooms' } = await searchParams
  const safeView = ['my-rooms', 'shared', 'recent', 'starred'].includes(view)
    ? view
    : 'my-rooms'

  const user = session.user
  const initials = (user.name ?? user.email ?? 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const [rawRooms, initialInvitations] = await Promise.all([
    getRooms(user.id!, safeView),
    prisma.invitation.findMany({
      where: { inviteeId: user.id! },
      include: {
        room: { select: { id: true, name: true, language: true } },
        inviter: { select: { id: true, name: true, image: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])
  // Snapshot bytes stay out of the client payload
  const rooms = rawRooms.map(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    ({ contentSnapshot, ...room }) => room
  )
  const { title, subtitle } = viewMeta[safeView]

  return (
    <>
      <CollabWarmup />
      <DashboardShell
        userInitials={initials}
        safeView={safeView}
        title={title}
        subtitle={subtitle}
        signOutAction={handleSignOut}
        initialInvitations={initialInvitations.map((inv) => ({
          id: inv.id,
          role: inv.role,
          createdAt: inv.createdAt.toISOString(),
          room: inv.room,
          inviter: inv.inviter,
        }))}
      >
        <RoomList
          key={safeView}
          initialRooms={rooms}
          view={safeView}
          currentUserId={user.id}
        />
      </DashboardShell>
    </>
  )
}
