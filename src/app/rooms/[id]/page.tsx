import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, Settings, Users, Code, Globe, Lock } from 'lucide-react'
import { ShareButton } from '@/components/rooms/share-button'
import type { Metadata } from 'next'

interface RoomPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: RoomPageProps): Promise<Metadata> {
  const { id } = await params
  const room = await prisma.room.findUnique({
    where: { id },
    select: { name: true },
  })
  return {
    title: room ? `${room.name} — codeR` : 'Room not found',
  }
}

async function getRoomWithAccess(roomId: string, userId: string) {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      owner: { select: { id: true, name: true, image: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true, email: true } },
        },
      },
      shareLinks: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        select: {
          id: true,
          token: true,
          role: true,
          expiresAt: true,
          createdAt: true,
          roomId: true,
        },
      },
      _count: { select: { members: true } },
    },
  })

  if (!room) return null

  const isOwner = room.ownerId === userId
  const memberRole = isOwner
    ? 'OWNER'
    : (room.members.find((m) => m.userId === userId)?.role ?? null)

  if (!isOwner && !memberRole && !room.isPublic) return null

  return { room, userRole: isOwner ? 'OWNER' : memberRole }
}

export default async function RoomPage({ params }: RoomPageProps) {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  const { id } = await params
  const result = await getRoomWithAccess(id, session.user.id!)

  if (!result) notFound()

  const { room, userRole } = result

  return (
    <div className="flex h-screen flex-col bg-black text-[#F0F0F0]">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-black px-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 text-[#888888]" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[#FF2D55]">▊</span>
            <h1 className="text-lg font-semibold text-white">{room.name}</h1>
          </div>
          <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-[#888888]">
            {room.language}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {userRole === 'OWNER' && (
            <Link
              href={`/rooms/${id}/settings`}
              className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-[#888888] transition-colors hover:bg-white/5 hover:text-[#F0F0F0]"
            >
              <Settings className="h-4 w-4" />
              Settings
            </Link>
          )}
          <ShareButton />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-[#FF2D55]/10 p-4">
              <Code className="h-8 w-8 text-[#FF2D55]" />
            </div>
          </div>
          <h2 className="mb-2 text-xl font-semibold">Editor coming soon</h2>
          <p className="mb-4 text-sm text-[#888888]">
            The real-time collaborative editor will be available here in Phase
            3.
          </p>
          <div className="flex items-center justify-center gap-4 text-xs text-[#555555]">
            <span className="flex items-center gap-1">
              {room.isPublic ? (
                <Globe className="h-3 w-3" />
              ) : (
                <Lock className="h-3 w-3" />
              )}
              {room.isPublic ? 'Public room' : 'Private room'}
            </span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {room._count.members} members
            </span>
          </div>

          {room.description && (
            <p className="mx-auto mt-4 max-w-md text-sm text-[#888888]">
              {room.description}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
