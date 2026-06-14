import { getFolderHandle, ensureFolderPermission } from '@/lib/local-folder'
import { isSelfWrite } from '@/lib/webcontainer-export'
import { isImportable, MAX_IMPORT_SIZE } from '@/lib/webcontainer-watch'

const SCAN_EXCLUDED_DIRS = new Set(['node_modules', '.git', '.npm', '.cache'])
const POLL_MS = 2000
const MAX_FILES = 2000

export interface DiskFile {
  name: string
  content: string
}

interface LocalWatcherCallbacks {
  applyDiskFiles: (files: DiskFile[]) => void
  getEditorFileNames: () => Set<string>
}

let pollTimer: ReturnType<typeof setInterval> | null = null
let scanning = false
// path → lastModified from the previous scan; null = no baseline yet
let knownMtimes: Map<string, number> | null = null

async function collectDiskFiles(
  root: FileSystemDirectoryHandle
): Promise<Map<string, File>> {
  const files = new Map<string, File>()

  async function walk(
    dir: FileSystemDirectoryHandle,
    prefix: string
  ): Promise<void> {
    for await (const entry of dir.values()) {
      if (files.size >= MAX_FILES) return
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.kind === 'directory') {
        if (!SCAN_EXCLUDED_DIRS.has(entry.name)) {
          await walk(entry as FileSystemDirectoryHandle, path)
        }
      } else {
        files.set(path, await (entry as FileSystemFileHandle).getFile())
      }
    }
  }

  await walk(root, '')
  return files
}

async function scan(
  roomId: string,
  callbacks: LocalWatcherCallbacks
): Promise<void> {
  if (scanning || document.hidden) return
  scanning = true
  try {
    const handle = await getFolderHandle(roomId).catch(() => null)
    if (!handle) return
    if (!(await ensureFolderPermission(handle, false))) return

    const diskFiles = await collectDiskFiles(handle)
    const previous = knownMtimes
    knownMtimes = new Map(
      Array.from(diskFiles, ([path, file]) => [path, file.lastModified])
    )
    // First scan only establishes the baseline — initial content comes from
    // Yjs (collaborative truth) via the existing auto-restore path
    if (!previous) return

    const editorNames = callbacks.getEditorFileNames()
    const changes: DiskFile[] = []
    for (const [path, file] of diskFiles) {
      if (previous.get(path) === file.lastModified) continue
      if (file.size > MAX_IMPORT_SIZE) continue
      const data = new Uint8Array(await file.arrayBuffer())
      if (isSelfWrite(path, data)) continue
      if (!editorNames.has(path) && !isImportable(path, data)) continue
      changes.push({ name: path, content: new TextDecoder().decode(data) })
    }
    if (changes.length > 0) callbacks.applyDiskFiles(changes)
  } catch {
    // folder moved/revoked mid-scan — next tick retries
  } finally {
    scanning = false
  }
}

export function startLocalFolderWatcher(
  roomId: string,
  callbacks: LocalWatcherCallbacks
): void {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    void scan(roomId, callbacks)
  }, POLL_MS)
}

export function stopLocalFolderWatcher(): void {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = null
  knownMtimes = null
  scanning = false
}
