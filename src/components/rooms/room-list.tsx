'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { RoomCard } from './room-card'
import { CreateRoomDialog } from './create-room-dialog'
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

interface RoomListProps {
  initialRooms: RoomWithRelations[]
  view?: string
}

export function RoomList({ initialRooms, view = 'my-rooms' }: RoomListProps) {
  const router = useRouter()
  const [rooms, setRooms] = useState(initialRooms)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [starredIds, setStarredIds] = useState<string[]>(() => {
    if (typeof window === 'undefined') return []
    const stored = localStorage.getItem('coder-starred-rooms')
    return stored ? JSON.parse(stored) : []
  })

  useEffect(() => {
    const onStorage = () => {
      const updated = localStorage.getItem('coder-starred-rooms')
      setStarredIds(updated ? JSON.parse(updated) : [])
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const filteredRooms =
    view === 'starred' ? rooms.filter((r) => starredIds.includes(r.id)) : rooms

  const handleCreateRoom = useCallback(
    async (data: {
      name: string
      description?: string
      language: string
      isPublic: boolean
    }) => {
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
    [router]
  )

  return (
    <>
      <div className="grid grid-cols-3 gap-5">
        <button
          onClick={() => setIsCreateOpen(true)}
          className="group flex h-48 flex-col items-center justify-center rounded-md border border-dashed border-white/10 transition-all duration-150 hover:border-[rgba(255,45,85,0.30)] hover:bg-[rgba(255,45,85,0.08)]"
        >
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full border border-white/10 transition-colors group-hover:border-[rgba(255,45,85,0.30)]">
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-[#555555]" />
            ) : (
              <Plus className="h-5 w-5 text-[#555555] transition-colors group-hover:text-[#FF2D55]" />
            )}
          </div>
          <span className="text-sm text-[#555555] transition-colors group-hover:text-[#888888]">
            New Room
          </span>
        </button>

        {filteredRooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>

      {view === 'starred' && filteredRooms.length === 0 && (
        <p className="mt-8 text-center text-sm text-[#555555]">
          No starred rooms — hover a room card and click ☆ to star it
        </p>
      )}

      {view !== 'starred' && rooms.length === 0 && (
        <p className="mt-8 text-center text-sm text-[#555555]">
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
