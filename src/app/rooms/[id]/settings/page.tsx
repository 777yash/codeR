import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, Settings } from 'lucide-react'
import type { Metadata } from 'next'
import { RoomSettingsClient } from './settings-client'

interface SettingsPageProps {
  params: Promise<{ id: string }>
}

export async function generateMetadata({
  params,
}: SettingsPageProps): Promise<Metadata> {
  const { id } = await params
  const room = await prisma.room.findUnique({
    where: { id },
    select: { name: true },
  })
  return {
    title: room ? `${room.name} Settings — codeR` : 'Room not found',
  }
}

async function getRoomForSettings(roomId: string, userId: string) {
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
    },
  })

  if (!room) return null

  const isOwner = room.ownerId === userId
  const memberRole = isOwner
    ? 'OWNER'
    : (room.members.find((m) => m.userId === userId)?.role ?? null)

  if (!isOwner && !memberRole) return null

  return {
    room,
    userRole: isOwner ? 'OWNER' : (memberRole as 'OWNER' | 'EDITOR' | 'VIEWER'),
  }
}

export default async function RoomSettingsPage({ params }: SettingsPageProps) {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  const { id } = await params
  const result = await getRoomForSettings(id, session.user.id!)

  if (!result) notFound()

  const { room, userRole } = result

  return (
    <div className="flex h-screen flex-col bg-black text-[#F0F0F0]">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-black px-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/rooms/${id}`}
            className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 text-[#888888]" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-[#FF2D55]">▊</span>
            <h1 className="text-lg font-semibold text-white">{room.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href={`/rooms/${id}`}
            className="flex h-8 items-center gap-1.5 rounded-md px-3 text-sm text-[#888888] transition-colors hover:bg-white/5 hover:text-[#F0F0F0]"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-2xl">
          <h2 className="mb-6 text-2xl font-semibold">Room Settings</h2>
          <RoomSettingsClient room={room} userRole={userRole} />
        </div>
      </main>
    </div>
  )
}
