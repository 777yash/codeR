'use client'

import Link from 'next/link'
import Image from 'next/image'
import { MoreHorizontal, Users, Globe, Lock, Code, Star } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState, useSyncExternalStore } from 'react'
import type {
  Room,
  User as PrismaUser,
  RoomMember,
} from '@/generated/prisma/client'

type RoomWithRelations = Room & {
  owner: Pick<PrismaUser, 'id' | 'name' | 'image'>
  members: (RoomMember & {
    user: Pick<PrismaUser, 'id' | 'name' | 'image'>
  })[]
  _count: { members: number }
}

interface RoomCardProps {
  room: RoomWithRelations
  onClick?: () => void
}

const languageColors: Record<string, string> = {
  javascript: '#F7DF1E',
  typescript: '#3178C6',
  python: '#3776AB',
  java: '#ED8B00',
  cpp: '#00599C',
  c: '#A8B9CC',
  csharp: '#239120',
  go: '#00ADD8',
  rust: '#DEA584',
  ruby: '#CC342D',
  php: '#777BB4',
  swift: '#FA7343',
  kotlin: '#7F52FF',
  scala: '#DC322F',
  r: '#276DC3',
  sql: '#E38C00',
  bash: '#4EAA25',
  lua: '#000080',
  perl: '#39457E',
  haskell: '#5D4F85',
  elixir: '#6E4A7E',
  clojure: '#5881D8',
  dart: '#0175C2',
  julia: '#9558B2',
  matlab: '#0076A8',
  vbnet: '#512BD4',
  cobol: '#005ca5',
  fortran: '#4D41B1',
  assembly: '#6E4C13',
}

export function RoomCard({ room, onClick }: RoomCardProps) {
  const memberCount = room._count?.members ?? room.members?.length ?? 0
  const languageColor =
    languageColors[room.language] || 'var(--coder-text-secondary)'
  const [avatarError, setAvatarError] = useState(false)
  const starred = useSyncExternalStore(
    (cb) => {
      window.addEventListener('storage', cb)
      return () => window.removeEventListener('storage', cb)
    },
    () => {
      try {
        const stored = localStorage.getItem('coder-starred-rooms')
        const ids = stored ? (JSON.parse(stored) as string[]) : []
        return ids.includes(room.id)
      } catch {
        return false
      }
    },
    () => false // server snapshot — matches initial client render, no hydration mismatch
  )

  function toggleStar(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const stored = localStorage.getItem('coder-starred-rooms')
    const ids: string[] = stored ? JSON.parse(stored) : []
    const next = starred
      ? ids.filter((id) => id !== room.id)
      : [...ids, room.id]
    localStorage.setItem('coder-starred-rooms', JSON.stringify(next))
    // storage event only fires in other tabs — dispatch manually for same-tab reactivity
    window.dispatchEvent(
      new StorageEvent('storage', { key: 'coder-starred-rooms' })
    )
  }

  return (
    <div className="group border-app bg-app-card shadow-app-sm relative flex h-48 flex-col justify-between rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--coder-border-accent)] hover:shadow-[var(--coder-shadow-md)]">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: languageColor }}
            />
            <h3 className="text-app truncate text-sm font-semibold">
              {room.name}
            </h3>
          </div>
          {room.description && (
            <p className="text-app-muted mb-2 line-clamp-2 text-xs">
              {room.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleStar}
            className="relative z-20 flex h-8 w-8 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--coder-bg-card-hover)]"
            aria-label={starred ? 'Unstar room' : 'Star room'}
          >
            <Star
              className="h-4 w-4 transition-colors"
              style={{
                color: starred ? '#FF9F0A' : 'var(--coder-text-tertiary)',
              }}
              fill={starred ? '#FF9F0A' : 'none'}
            />
          </button>
          <button
            onClick={onClick}
            className="relative z-20 flex h-8 w-8 items-center justify-center rounded opacity-0 transition-opacity group-hover:opacity-100 hover:bg-[var(--coder-bg-card-hover)]"
          >
            <MoreHorizontal className="h-4 w-4 text-[var(--coder-text-secondary)]" />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-app-muted flex items-center gap-1 text-xs">
            <Code className="h-3.5 w-3.5" />
            <span>{room.language}</span>
          </div>
          <div className="text-app-muted flex items-center gap-1 text-xs">
            {room.isPublic ? (
              <Globe className="h-3.5 w-3.5" />
            ) : (
              <Lock className="h-3.5 w-3.5" />
            )}
          </div>
        </div>
        <div className="text-app-muted flex items-center gap-1 text-xs">
          <Users className="h-3.5 w-3.5" />
          <span>{memberCount}</span>
        </div>
      </div>

      <div className="border-app mt-auto flex items-center justify-between border-t pt-3">
        <div className="flex items-center gap-1.5">
          {room.owner?.image && !avatarError ? (
            <Image
              src={room.owner.image}
              alt={room.owner.name || 'Owner'}
              width={20}
              height={20}
              className="rounded-full"
              onError={() => setAvatarError(true)}
            />
          ) : (
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--coder-accent)]/20 text-[10px] font-medium text-[var(--coder-accent)]">
              {(room.owner?.name || 'U')[0].toUpperCase()}
            </div>
          )}
          <span className="text-app-muted text-xs">
            {room.owner?.name || 'Unknown'}
          </span>
        </div>
        <span className="text-app-dim text-xs">
          {formatDistanceToNow(new Date(room.updatedAt), { addSuffix: true })}
        </span>
      </div>

      <Link
        href={`/rooms/${room.id}`}
        className="absolute inset-0 z-10"
        prefetch={false}
      >
        <span className="sr-only">Open room {room.name}</span>
      </Link>
    </div>
  )
}
