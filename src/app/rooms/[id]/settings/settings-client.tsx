'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Check, Link2, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type {
  Room,
  User as PrismaUser,
  RoomMember,
  ShareLink,
} from '@/generated/prisma/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { LANGUAGES } from '@/lib/editor-options'

export type RoomWithRelations = Room & {
  owner: Pick<PrismaUser, 'id' | 'name' | 'image' | 'email'>
  members: (RoomMember & {
    user: Pick<PrismaUser, 'id' | 'name' | 'image' | 'email'>
  })[]
  shareLinks: (ShareLink & {})[]
}

interface RoomSettingsClientProps {
  room: RoomWithRelations
  userRole: 'OWNER' | 'EDITOR' | 'VIEWER'
}

export function RoomSettingsClient({
  room,
  userRole,
}: RoomSettingsClientProps) {
  const router = useRouter()
  const [name, setName] = useState(room.name)
  const [description, setDescription] = useState(room.description || '')
  const [language, setLanguage] = useState<string>(room.language)
  const [isPublic, setIsPublic] = useState(room.isPublic)
  const [isSaving, setIsSaving] = useState(false)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'EDITOR' | 'VIEWER'>('EDITOR')
  const [isInviting, setIsInviting] = useState(false)

  const [shareLinks, setShareLinks] = useState(room.shareLinks)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)
  const [isCreatingLink, setIsCreatingLink] = useState(false)

  const [memberToRemove, setMemberToRemove] = useState<string | null>(null)
  const [isRemoving, setIsRemoving] = useState(false)

  const isOwner = userRole === 'OWNER'

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/rooms/${room.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description: description || null,
          language,
          isPublic,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update room')
      }

      toast.success('Room settings saved')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    } finally {
      setIsSaving(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setIsInviting(true)
    try {
      const res = await fetch(`/api/rooms/${room.id}/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to invite user')
      }

      toast.success(`Invited ${inviteEmail}`)
      setInviteEmail('')
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to invite')
    } finally {
      setIsInviting(false)
    }
  }

  const handleCreateShareLink = async () => {
    setIsCreatingLink(true)
    try {
      const res = await fetch(`/api/rooms/${room.id}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'VIEWER' }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create share link')
      }

      const link = await res.json()
      setShareLinks([...shareLinks, link])
      toast.success('Share link created')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create link'
      )
    } finally {
      setIsCreatingLink(false)
    }
  }

  const handleCopyLink = async (token: string) => {
    const url = `${window.location.origin}/share/${token}`
    await navigator.clipboard.writeText(url)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  const handleDeleteLink = async (token: string) => {
    try {
      await fetch(`/api/rooms/${room.id}/share`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      setShareLinks(shareLinks.filter((l) => l.token !== token))
      toast.success('Share link revoked')
    } catch {
      toast.error('Failed to revoke link')
    }
  }

  const handleRemoveMember = async (userId: string) => {
    setIsRemoving(true)
    try {
      const res = await fetch(`/api/rooms/${room.id}/members/${userId}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to remove member')
      }

      toast.success('Member removed')
      setMemberToRemove(null)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove')
    } finally {
      setIsRemoving(false)
    }
  }

  const handleChangeRole = async (
    userId: string,
    newRole: 'EDITOR' | 'VIEWER'
  ) => {
    try {
      const res = await fetch(`/api/rooms/${room.id}/members/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to change role')
      }

      toast.success('Role updated')
      router.refresh()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to change role'
      )
    }
  }

  const handleDeleteRoom = async () => {
    if (
      !confirm(
        'Are you sure you want to delete this room? This action cannot be undone.'
      )
    )
      return

    try {
      const res = await fetch(`/api/rooms/${room.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete room')
      toast.success('Room deleted')
      router.push('/dashboard')
    } catch {
      toast.error('Failed to delete room')
    }
  }

  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <h3 className="text-lg font-medium">General Settings</h3>

        <div className="space-y-4 rounded-lg border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Room Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isOwner && userRole !== 'EDITOR'}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!isOwner && userRole !== 'EDITOR'}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Language</label>
            <Select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              disabled={!isOwner && userRole !== 'EDITOR'}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => isOwner && setIsPublic(!isPublic)}
              disabled={!isOwner}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isPublic
                  ? 'bg-[var(--coder-accent)]'
                  : 'bg-[var(--coder-text-tertiary)]'
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  isPublic ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <label className="text-sm text-[var(--coder-text-secondary)]">
              {isPublic ? 'Public room' : 'Private room'}
            </label>
          </div>

          {(isOwner || userRole === 'EDITOR') && (
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-[var(--coder-accent)] hover:bg-[var(--coder-accent)]/90"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </div>

      {isOwner && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Invite Members</h3>

          <form onSubmit={handleInvite} className="flex gap-2">
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
              className="flex-1"
            />
            <Select
              value={inviteRole}
              onChange={(e) =>
                setInviteRole(e.target.value as 'EDITOR' | 'VIEWER')
              }
              className="w-32"
            >
              <option value="EDITOR">Editor</option>
              <option value="VIEWER">Viewer</option>
            </Select>
            <Button
              type="submit"
              disabled={isInviting || !inviteEmail.trim()}
              className="bg-[var(--coder-accent)] hover:bg-[var(--coder-accent)]/90"
            >
              {isInviting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Invite'
              )}
            </Button>
          </form>
        </div>
      )}

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Members ({room.members.length})</h3>

        <div className="space-y-2">
          {room.members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between rounded-lg border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] p-3"
            >
              <div className="flex items-center gap-3">
                {member.user.image ? (
                  <img
                    src={member.user.image}
                    alt={member.user.name || ''}
                    className="h-8 w-8 rounded-full"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--coder-accent)]/20 text-xs font-medium text-[var(--coder-accent)]">
                    {(member.user.name || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium">
                    {member.user.name || member.user.email}
                    {member.userId === room.ownerId && (
                      <span className="ml-2 text-xs text-[var(--coder-accent)]">
                        (Owner)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-[var(--coder-text-secondary)]">
                    {member.user.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {member.userId !== room.ownerId && isOwner && (
                  <>
                    <Select
                      value={member.role}
                      onChange={(e) =>
                        handleChangeRole(
                          member.userId,
                          e.target.value as 'EDITOR' | 'VIEWER'
                        )
                      }
                      className="w-28"
                    >
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </Select>
                    <button
                      onClick={() => setMemberToRemove(member.userId)}
                      className="flex h-8 w-8 items-center justify-center rounded text-[var(--coder-text-secondary)] transition-colors hover:bg-[var(--coder-bg-card-hover)] hover:text-[var(--coder-accent)]"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                {member.userId === room.ownerId && (
                  <span className="rounded-full bg-[var(--coder-bg-card-hover)] px-2 py-0.5 text-xs text-[var(--coder-text-secondary)]">
                    {member.role}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isOwner && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Share Links</h3>

          <div className="space-y-2">
            {shareLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between rounded-lg border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] p-3"
              >
                <div className="flex items-center gap-2">
                  <Link2 className="h-4 w-4 text-[var(--coder-text-secondary)]" />
                  <code className="text-sm text-[var(--coder-text-primary)]">
                    /share/{link.token}
                  </code>
                  <span className="rounded-full bg-[var(--coder-bg-card-hover)] px-2 py-0.5 text-xs text-[var(--coder-text-secondary)]">
                    {link.role}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyLink(link.token)}
                    className="flex h-8 w-8 items-center justify-center rounded text-[var(--coder-text-secondary)] transition-colors hover:bg-[var(--coder-bg-card-hover)] hover:text-[var(--coder-text-primary)]"
                  >
                    {copiedToken === link.token ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleDeleteLink(link.token)}
                    className="flex h-8 w-8 items-center justify-center rounded text-[var(--coder-text-secondary)] transition-colors hover:bg-[var(--coder-bg-card-hover)] hover:text-[var(--coder-accent)]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={handleCreateShareLink}
              disabled={isCreatingLink}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--coder-border-mid)] p-3 text-sm text-[var(--coder-text-secondary)] transition-colors hover:border-[var(--coder-accent)]/30 hover:text-[var(--coder-text-primary)]"
            >
              {isCreatingLink ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Create Share Link
            </button>
          </div>
        </div>
      )}

      {isOwner && (
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-[var(--coder-accent)]">
            Danger Zone
          </h3>
          <div className="rounded-lg border border-[var(--coder-accent)]/30 bg-[var(--coder-accent)]/5 p-4">
            <p className="mb-3 text-sm text-[var(--coder-text-secondary)]">
              Deleting a room is permanent. All room data, including version
              history, will be lost.
            </p>
            <Button
              variant="destructive"
              onClick={handleDeleteRoom}
              className="bg-[var(--coder-accent)] text-white transition-all duration-300 hover:bg-[var(--coder-accent-hover)] hover:shadow-[var(--coder-shadow-accent)]"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Room
            </Button>
          </div>
        </div>
      )}

      {memberToRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-lg border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] p-6">
            <h3 className="mb-2 text-lg font-semibold">Remove Member</h3>
            <p className="mb-4 text-sm text-[var(--coder-text-secondary)]">
              Are you sure you want to remove this member from the room?
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMemberToRemove(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => handleRemoveMember(memberToRemove)}
                disabled={isRemoving}
                className="bg-[var(--coder-accent)] hover:bg-[var(--coder-accent)]/90"
              >
                {isRemoving && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Remove
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
