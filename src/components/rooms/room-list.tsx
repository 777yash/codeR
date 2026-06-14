'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { RoomCard } from './room-card'
import { CreateRoomDialog } from './create-room-dialog'
import type {
  Room,
  User as PrismaUser,
  RoomMember,
} from '@/generated/prisma/client'

type RoomWithRelations = Omit<Room, 'contentSnapshot'> & {
  owner: Pick<PrismaUser, 'id' | 'name' | 'image'>
  members: (RoomMember & {
    user: Pick<PrismaUser, 'id' | 'name' | 'image'>
  })[]
  _count: { members: number }
}

interface RoomListProps {
  initialRooms: RoomWithRelations[]
  view?: string
  currentUserId?: string
}

export function RoomList({
  initialRooms,
  view = 'my-rooms',
  currentUserId,
}: RoomListProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const [rooms, setRooms] = useState(initialRooms)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // Two-pass: start with [] so SSR and initial client render match,
  // then sync localStorage on mount and on cross-tab storage events.
  const [starredIds, setStarredIds] = useState<string[]>([])

  useEffect(() => {
    const read = () => {
      const stored = localStorage.getItem('coder-starred-rooms')
      setStarredIds(stored ? (JSON.parse(stored) as string[]) : [])
    }
    read()
    window.addEventListener('storage', read)
    return () => window.removeEventListener('storage', read)
  }, [])

  const filteredRooms =
    view === 'starred' ? rooms.filter((r) => starredIds.includes(r.id)) : rooms

  const handleCreateRoom = useCallback(
    async (data: { name: string; description?: string; isPublic: boolean }) => {
      setIsLoading(true)
      try {
        const res = await fetch('/api/rooms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        })

        if (!res.ok) {
          const error = await res.json()
          throw new Error(error.error || 'Failed to create room')
        }

        const newRoom = await res.json()
        posthog?.capture('room_created', {
          is_public: data.isPublic,
        })
        setRooms((prev) => [newRoom, ...prev])
        setIsCreateOpen(false)
        toast.success(`Room "${data.name}" created`)
        router.refresh()
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Failed to create room'
        )
      } finally {
        setIsLoading(false)
      }
    },
    [router, posthog]
  )

  return (
    <>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="group flex h-48 flex-col items-center justify-center rounded-xl border border-dashed border-[var(--coder-border-mid)] transition-all duration-150 hover:border-[var(--coder-border-accent)] hover:bg-[var(--coder-accent-dim)]"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-[var(--coder-border-mid)] transition-colors group-hover:border-[var(--coder-border-accent)]">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[var(--coder-text-tertiary)]" />
            ) : (
              <Plus className="h-5 w-5 text-[var(--coder-text-tertiary)] transition-colors group-hover:text-[var(--coder-accent)]" />
            )}
          </div>
          <span className="text-sm text-[var(--coder-text-tertiary)] transition-colors group-hover:text-[var(--coder-text-secondary)]">
            New Room
          </span>
        </button>

        {filteredRooms.map((room) => (
          <RoomCard
            key={room.id}
            room={room}
            currentUserId={currentUserId}
            onDeleted={(roomId) => {
              setRooms((prev) => prev.filter((r) => r.id !== roomId))
              router.refresh()
            }}
          />
        ))}
      </div>

      {view === 'starred' && filteredRooms.length === 0 && (
        <p className="mt-8 text-center text-sm text-[var(--coder-text-tertiary)]">
          No starred rooms — hover a room card and click ☆ to star it
        </p>
      )}

      {view !== 'starred' && rooms.length === 0 && (
        <p className="mt-8 text-center text-sm text-[var(--coder-text-tertiary)]">
          {view === 'shared'
            ? 'No rooms shared with you yet'
            : view === 'recent'
              ? 'No recent rooms'
              : 'No rooms yet — create your first room to start collaborating'}
        </p>
      )}

      <CreateRoomDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSubmit={handleCreateRoom}
      />
    </>
  )
}
