'use client'

import { useState, useCallback } from 'react'
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
}

export function RoomList({ initialRooms }: RoomListProps) {
  const router = useRouter()
  const [rooms, setRooms] = useState(initialRooms)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [searchQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState<'all' | 'owned' | 'shared'>(
    'all'
  )

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch =
      room.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      room.description?.toLowerCase().includes(searchQuery.toLowerCase())

    if (activeFilter === 'owned') {
      return matchesSearch && room.members.some((m) => m.role === 'OWNER')
    }
    if (activeFilter === 'shared') {
      return matchesSearch && room.members.some((m) => m.role !== 'OWNER')
    }
    return matchesSearch
  })

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
      <div className="mb-6 flex border-b border-white/[0.06]">
        {(['all', 'owned', 'shared'] as const).map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-4 pb-3 text-sm transition-colors ${
              activeFilter === filter
                ? 'border-b-2 border-[#FF2D55] text-[#F0F0F0]'
                : 'text-[#888888] hover:text-[#F0F0F0]'
            }`}
          >
            {filter === 'all'
              ? `All (${rooms.length})`
              : filter === 'owned'
                ? 'My Rooms'
                : 'Shared'}
          </button>
        ))}
      </div>

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

      {filteredRooms.length === 0 && rooms.length > 0 && (
        <p className="mt-8 text-center text-sm text-[#555555]">
          No rooms match your search
        </p>
      )}

      {rooms.length === 0 && (
        <p className="mt-8 text-center text-sm text-[#555555]">
          No rooms yet — create your first room to start collaborating
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
