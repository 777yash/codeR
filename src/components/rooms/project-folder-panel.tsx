'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  isFileSystemAccessSupported,
  getFolderHandle,
  saveFolderHandle,
  clearFolderHandle,
  ensureFolderPermission,
} from '@/lib/local-folder'
import {
  exportContainerToFolder,
  exportFilesToFolder,
  restoreWithEditorExclusions,
} from '@/lib/webcontainer-export'
import { slugifyWorkdirName } from '@/lib/webcontainer'

interface ProjectFolderPanelProps {
  roomId: string
  roomName: string
}

type Busy = 'export' | 'restore' | null

/**
 * Link/manage the on-disk folder a room auto-saves to. Shared by the header
 * "Save project to disk" dialog and the room settings panel so both entry
 * points drive the same handle (one source of truth in IndexedDB).
 */
export function ProjectFolderPanel({
  roomId,
  roomName,
}: ProjectFolderPanelProps) {
  const [linkedName, setLinkedName] = useState<string | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  // Lazy init is safe here: the panel only mounts behind an opened dialog, so
  // it never renders during SSR — no hydration mismatch from reading storage.
  const [workdirInput, setWorkdirInput] = useState(() =>
    typeof window === 'undefined'
      ? ''
      : (localStorage.getItem(`coder-workdir:${roomId}`) ??
        slugifyWorkdirName(roomName))
  )

  const supported = isFileSystemAccessSupported()

  useEffect(() => {
    if (!supported) return
    getFolderHandle(roomId)
      .then((handle) => setLinkedName(handle?.name ?? null))
      .catch(() => undefined)
  }, [roomId, supported])

  async function exportTo(handle: FileSystemDirectoryHandle) {
    setBusy('export')
    try {
      if (!(await ensureFolderPermission(handle, true))) {
        toast.error('Folder permission denied')
        return
      }
      let count = await exportContainerToFolder(handle)
      if (count === null) {
        const { getAllFilesContent } =
          await import('@/components/editor/editor-client')
        count = await exportFilesToFolder(handle, getAllFilesContent())
      }
      toast.success(
        `Saved ${count} file${count === 1 ? '' : 's'} to "${handle.name}"`
      )
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? `Export failed — ${error.message}`
          : 'Export failed — folder may have been moved or deleted'
      )
    } finally {
      setBusy(null)
    }
  }

  async function handleChooseFolder() {
    try {
      const picked = await window.showDirectoryPicker({
        id: `coder-${roomId}`,
        mode: 'readwrite',
      })
      // Linking the same physical folder to several rooms cross-pollinates
      // their file lists via restore — each room gets its own subfolder
      const subName = slugifyWorkdirName(
        localStorage.getItem(`coder-workdir:${roomId}`) ?? roomName
      )
      const handle =
        picked.name === subName
          ? picked
          : await picked.getDirectoryHandle(subName, { create: true })
      await saveFolderHandle(roomId, handle)
      setLinkedName(handle.name)
      await exportTo(handle)
    } catch (error) {
      // AbortError = user dismissed the picker; anything else is a real failure
      if (error instanceof DOMException && error.name === 'AbortError') return
      toast.error(
        error instanceof Error && error.message
          ? `Couldn't link folder — ${error.message}`
          : "Couldn't link folder"
      )
    }
  }

  async function handleExport() {
    const handle = await getFolderHandle(roomId).catch(() => null)
    if (handle) await exportTo(handle)
  }

  async function handleRestore() {
    const handle = await getFolderHandle(roomId).catch(() => null)
    if (!handle) return
    setBusy('restore')
    try {
      if (!(await ensureFolderPermission(handle, true))) {
        toast.error('Folder permission denied')
        return
      }
      const count = await restoreWithEditorExclusions(handle)
      if (count === null) {
        toast.error('Runtime not ready — restore needs a booted container')
      } else {
        toast.success(
          `Restored ${count} file${count === 1 ? '' : 's'} into the container`
        )
      }
    } catch (error) {
      toast.error(
        error instanceof Error && error.message
          ? `Restore failed — ${error.message}`
          : 'Restore failed — folder may have been moved or deleted'
      )
    } finally {
      setBusy(null)
    }
  }

  async function handleUnlink() {
    await clearFolderHandle(roomId).catch(() => undefined)
    setLinkedName(null)
    toast.success('Folder unlinked')
  }

  function handleSaveWorkdir() {
    const slug = slugifyWorkdirName(workdirInput)
    localStorage.setItem(`coder-workdir:${roomId}`, slug)
    setWorkdirInput(slug)
    toast.success(
      `Container folder set to "${slug}" — applies on next room load`
    )
  }

  const actionButton =
    'flex h-8 items-center gap-1.5 rounded-md border border-[var(--coder-border-mid)] bg-[var(--coder-bg-card-hover)] px-3 text-xs font-medium text-[var(--coder-text-secondary)] transition-colors hover:bg-[var(--coder-bg-card-active)] disabled:cursor-not-allowed disabled:opacity-50'

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed text-[var(--coder-text-secondary)]">
        Link a folder on your machine and the project auto-saves there as it
        changes (without node_modules). Files created in the editor are written
        to disk, kept in sync, and removed from the folder when you delete them
        here. Each room saves into its own subfolder of the folder you pick.
      </p>

      {!supported ? (
        <p className="text-sm text-[var(--coder-text-tertiary)]">
          This browser doesn&apos;t support the File System Access API. Use
          Chrome or Edge to save projects to disk.
        </p>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-md border border-[var(--coder-border)] bg-[var(--coder-bg-surface)] px-3 py-2">
            <span className="text-xs text-[var(--coder-text-secondary)]">
              {linkedName ? (
                <>
                  Linked:{' '}
                  <span className="font-semibold text-[var(--coder-text-primary)]">
                    {linkedName}
                  </span>
                </>
              ) : (
                'No folder linked'
              )}
            </span>
            {linkedName && (
              <button
                onClick={handleUnlink}
                className="text-xs text-[var(--coder-text-tertiary)] underline hover:text-[var(--coder-text-secondary)]"
              >
                Unlink
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={handleChooseFolder} className={actionButton}>
              {linkedName ? 'Change folder…' : 'Choose folder…'}
            </button>
            {linkedName && (
              <>
                <button
                  onClick={handleExport}
                  disabled={busy !== null}
                  className={actionButton}
                >
                  {busy === 'export' && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Export now
                </button>
                <button
                  onClick={handleRestore}
                  disabled={busy !== null}
                  className={actionButton}
                >
                  {busy === 'restore' && (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  Restore into container
                </button>
              </>
            )}
          </div>
        </>
      )}

      <div className="border-t border-[var(--coder-border)] pt-4">
        <label className="mb-1.5 block text-xs font-medium text-[var(--coder-text-secondary)]">
          Container folder name
        </label>
        <div className="flex gap-2">
          <input
            value={workdirInput}
            onChange={(e) => setWorkdirInput(e.target.value)}
            className="h-8 flex-1 rounded-md border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] px-2 font-mono text-xs text-[var(--coder-text-primary)] outline-none focus:border-[var(--coder-accent)]"
            placeholder="my-project"
          />
          <button onClick={handleSaveWorkdir} className={actionButton}>
            Save
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-[var(--coder-text-tertiary)]">
          Shown as the terminal working directory (cosmetic). Applies the next
          time the room loads.
        </p>
      </div>
    </div>
  )
}
