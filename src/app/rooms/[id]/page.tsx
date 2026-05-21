import { cache } from 'react'
import { auth } from '@/auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { ArrowLeft, Play } from 'lucide-react'
import { ShareButton } from '@/components/rooms/share-button'
import { ThemeToggle } from '@/components/marketing/theme-toggle'
import type { Metadata } from 'next'
import { EditorWrapper } from './editor-wrapper'
import type { CollabMember } from '@/components/editor/collab-panel'
import { LanguageIcon } from '@/components/editor/language-icon'
import { LiveBadge } from '@/components/editor/live-badge'
import { SettingsDialog } from '@/components/editor/settings-dialog'
import type { RoomWithRelations } from '@/app/rooms/[id]/settings/settings-client'

interface RoomPageProps {
  params: Promise<{ id: string }>
}

const fetchRoom = cache(async (id: string) => {
  return prisma.room.findUnique({
    where: { id },
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
})

export async function generateMetadata({
  params,
}: RoomPageProps): Promise<Metadata> {
  const { id } = await params
  const room = await fetchRoom(id)
  return {
    title: room ? `${room.name} — codeR` : 'Room not found',
  }
}

async function getRoomWithAccess(roomId: string, userId: string) {
  const room = await fetchRoom(roomId)
  if (!room) return null

  const isOwner = room.ownerId === userId
  const memberRole = isOwner
    ? 'OWNER'
    : (room.members.find((m) => m.userId === userId)?.role ?? null)

  if (!isOwner && !memberRole && !room.isPublic) return null

  return { room, userRole: isOwner ? 'OWNER' : memberRole }
}

const LANG_LABEL: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  r: 'R',
  sql: 'SQL',
  bash: 'Bash',
  lua: 'Lua',
  perl: 'Perl',
  haskell: 'Haskell',
  elixir: 'Elixir',
  clojure: 'Clojure',
  dart: 'Dart',
  julia: 'Julia',
}

function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const AVATAR_COLORS = ['#FF2D55', '#BF5AF2', '#FF9F0A', '#32D74B']

export default async function RoomPage({ params }: RoomPageProps) {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  const { id } = await params
  const result = await getRoomWithAccess(id, session.user.id!)

  if (!result) notFound()

  const { room, userRole } = result

  // Build unified member list (owner first, then members)
  const allMembers: CollabMember[] = [
    {
      id: room.owner.id,
      name: room.owner.name,
      image: room.owner.image,
      role: 'OWNER',
    },
    ...room.members
      .filter((m) => m.userId !== room.owner.id)
      .map((m) => ({
        id: m.user.id,
        name: m.user.name,
        image: m.user.image,
        role: m.role as string,
      })),
  ]

  // Avatar cluster — show up to 3, rest as "+N"
  const visibleAvatars = allMembers.slice(0, 3)
  const extraCount = Math.max(0, allMembers.length - 3)

  return (
    <div className="bg-app text-app flex h-screen flex-col">
      {/* Top bar — 44px */}
      <header className="border-app bg-app flex h-11 shrink-0 items-center justify-between gap-4 border-b px-3">
        {/* Left: back + breadcrumb + lang badge */}
        <div className="flex items-center gap-2">
          <Link
            href={
              userRole === 'OWNER' ? '/dashboard' : '/dashboard?view=shared'
            }
            className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/5"
            title="Back to dashboard"
          >
            <ArrowLeft className="h-3.5 w-3.5 text-[#555555]" />
          </Link>

          {/* Breadcrumb */}
          <div className="flex items-center gap-1 text-xs">
            <span className="text-[#555555]">dashboard</span>
            <span className="text-[#333]">›</span>
            <span className="text-app flex items-center gap-1 font-medium">
              <span className="text-app-accent">▊</span>
              {room.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5">
            <LanguageIcon language={room.language} size={14} />
            <span className="text-[11px] font-medium text-[#888888]">
              {LANG_LABEL[room.language.toLowerCase()] ?? room.language}
            </span>
          </div>
        </div>

        {/* Center: live badge + avatar cluster */}
        <div className="flex items-center gap-3">
          {/* Live badge — client component, polls presence API */}
          <LiveBadge roomId={id} />

          {/* Avatar cluster */}
          <div className="flex items-center">
            {visibleAvatars.map((member, i) => {
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length]
              return (
                <div
                  key={member.id}
                  title={member.name ?? 'Unknown'}
                  style={{
                    backgroundColor: color + '28',
                    color,
                    marginLeft: i === 0 ? 0 : -6,
                    zIndex: visibleAvatars.length - i,
                  }}
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-black text-[10px] font-semibold"
                >
                  {getInitials(member.name)}
                </div>
              )
            })}
            {extraCount > 0 && (
              <span
                className="ml-1.5 text-[11px] text-[#555555]"
                style={{ zIndex: 0 }}
              >
                +{extraCount}
              </span>
            )}
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <ShareButton roomId={id} userRole={userRole ?? null} />

          {userRole !== 'VIEWER' && (
            <Link
              href={`/rooms/${id}/run`}
              className="flex h-7 items-center gap-1.5 rounded-md bg-[#32D74B] px-3 text-xs font-semibold text-black transition-colors hover:bg-[#32D74B]/90"
            >
              <Play className="h-3 w-3" />
              Run
            </Link>
          )}

          {userRole === 'OWNER' && (
            <SettingsDialog
              room={room as unknown as RoomWithRelations}
              userRole="OWNER"
            />
          )}
        </div>
      </header>

      <EditorWrapper
        roomId={id}
        initialLanguage={room.language}
        readOnly={userRole === 'VIEWER'}
        roomName={room.name}
        members={allMembers}
        currentUserId={session.user.id!}
        currentUserName={
          session.user.name ?? session.user.email ?? session.user.id!
        }
      />
    </div>
  )
}
