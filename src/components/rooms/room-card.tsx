'use client'

import Image from 'next/image'
import {
  MoreHorizontal,
  Users,
  Globe,
  Lock,
  Star,
  Trash2,
  Link2,
  Loader2,
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useState, useEffect, useRef, useSyncExternalStore } from 'react'
import { toast } from 'sonner'
import type {
  Room,
  User as PrismaUser,
  RoomMember,
} from '@/generated/prisma/client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  getFolderHandle,
  clearFolderHandle,
  ensureFolderPermission,
} from '@/lib/local-folder'

type RoomWithRelations = Omit<Room, 'contentSnapshot'> & {
  owner: Pick<PrismaUser, 'id' | 'name' | 'image'>
  members: (RoomMember & {
    user: Pick<PrismaUser, 'id' | 'name' | 'image'>
  })[]
  _count: { members: number }
}

interface RoomCardProps {
  room: RoomWithRelations
  currentUserId?: string
  onDeleted?: (roomId: string) => void
}

export function RoomCard({ room, currentUserId, onDeleted }: RoomCardProps) {
  const memberCount = room._count?.members ?? room.members?.length ?? 0
  const isOwner = currentUserId === room.ownerId
  const [avatarError, setAvatarError] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [linkedFolder, setLinkedFolder] =
    useState<FileSystemDirectoryHandle | null>(null)
  const [deleteDiskFiles, setDeleteDiskFiles] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!menuOpen) return
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [menuOpen])

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

  function handleCopyLink() {
    setMenuOpen(false)
    void navigator.clipboard
      .writeText(`${window.location.origin}/rooms/${room.id}`)
      .then(() => toast.success('Room link copied'))
  }

  async function openDeleteConfirm() {
    setMenuOpen(false)
    setDeleteDiskFiles(false)
    setLinkedFolder(await getFolderHandle(room.id).catch(() => null))
    setConfirmOpen(true)
  }

  async function deleteLinkedFolderFiles(handle: FileSystemDirectoryHandle) {
    if (!(await ensureFolderPermission(handle, true))) {
      toast.warning(
        `Folder permission denied — files in "${handle.name}" were kept`
      )
      return
    }
    const names: string[] = []
    for await (const entry of handle.values()) names.push(entry.name)
    for (const name of names) {
      await handle.removeEntry(name, { recursive: true })
    }
    // Removing the (now empty) folder itself needs the non-standard
    // FileSystemHandle.remove() — skip silently where unsupported
    await (
      handle as unknown as {
        remove?: (opts: { recursive: boolean }) => Promise<void>
      }
    )
      .remove?.({ recursive: true })
      ?.catch(() => undefined)
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: string
        } | null
        throw new Error(data?.error ?? 'Failed to delete room')
      }
      if (deleteDiskFiles && linkedFolder) {
        try {
          await deleteLinkedFolderFiles(linkedFolder)
        } catch {
          toast.error(
            `Room deleted, but some files in "${linkedFolder.name}" could not be removed`
          )
        }
      }
      await clearFolderHandle(room.id).catch(() => undefined)
      localStorage.removeItem(`coder-workdir:${room.id}`)
      toast.success(`Room "${room.name}" deleted`)
      setConfirmOpen(false)
      onDeleted?.(room.id)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete room'
      )
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="group border-app bg-app-card shadow-app-sm relative flex h-48 flex-col justify-between rounded-xl border p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--coder-border-accent)] hover:shadow-[var(--coder-shadow-md)]">
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <h3 className="text-app mb-1 truncate text-sm font-semibold">
            {room.name}
          </h3>
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
          <div ref={menuRef} className="relative z-20">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Room actions"
              className={`flex h-8 w-8 items-center justify-center rounded transition-opacity group-hover:opacity-100 hover:bg-[var(--coder-bg-card-hover)] ${
                menuOpen ? 'bg-[var(--coder-bg-card-hover)]' : 'opacity-0'
              }`}
            >
              <MoreHorizontal className="h-4 w-4 text-[var(--coder-text-secondary)]" />
            </button>
            {menuOpen && (
              <div className="border-app-mid bg-app-surface absolute top-9 right-0 min-w-[160px] rounded-md border py-1 shadow-[var(--coder-shadow-md)]">
                <button
                  onClick={handleCopyLink}
                  className="text-app hover-app-card flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                >
                  <Link2 className="h-3 w-3 opacity-60" />
                  Copy link
                </button>
                {isOwner && (
                  <>
                    <div className="border-app my-1 border-t" />
                    <button
                      onClick={() => void openDeleteConfirm()}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-400/10"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete room
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-app-muted flex items-center gap-1 text-xs">
          {room.isPublic ? (
            <>
              <Globe className="h-3.5 w-3.5" />
              <span>Public</span>
            </>
          ) : (
            <>
              <Lock className="h-3.5 w-3.5" />
              <span>Private</span>
            </>
          )}
        </div>
        <div className="text-app-muted flex items-center gap-1 text-xs">
          <Users className="h-3.5 w-3.5" />
          <span>
            {memberCount} member{memberCount === 1 ? '' : 's'}
          </span>
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

      {/* Plain <a> — a full-page load is required so the COOP/COEP headers
          on /rooms apply and the in-browser runtime can boot */}
      <a href={`/rooms/${room.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">Open room {room.name}</span>
      </a>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete room</DialogTitle>
            <DialogDescription>
              Permanently delete{' '}
              <span className="text-app font-semibold">{room.name}</span>? All
              files, version history, and chat in this room will be lost for
              every member. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {linkedFolder && (
            <label className="border-app bg-app-surface flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2.5">
              <input
                type="checkbox"
                checked={deleteDiskFiles}
                onChange={(e) => setDeleteDiskFiles(e.target.checked)}
                className="mt-0.5 accent-[var(--coder-accent)]"
              />
              <span className="text-app-muted text-xs leading-relaxed">
                Also delete the files saved to the{' '}
                <span className="text-app font-semibold">
                  {linkedFolder.name}
                </span>{' '}
                folder on this computer. Leave unchecked to keep a local copy of
                the project.
              </span>
            </label>
          )}
          <DialogFooter className="gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              disabled={deleting}
              className="border-app-mid text-app-muted hover:text-app h-8 rounded-md border px-3 text-xs font-medium transition-colors hover:bg-[var(--coder-bg-card-hover)] disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex h-8 items-center gap-1.5 rounded-md bg-red-500 px-3 text-xs font-semibold text-white transition-colors hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {deleting && <Loader2 className="h-3 w-3 animate-spin" />}
              Delete room
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
