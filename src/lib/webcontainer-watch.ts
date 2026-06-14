import { toast } from 'sonner'
import type { WebContainer } from '@webcontainer/api'
import { getBootedWebContainer } from '@/lib/webcontainer'
import { sanitizeFilePath, isSelfContainerWrite } from '@/lib/webcontainer-fs'
import {
  writeDiskFile,
  exportContainerToFolder,
} from '@/lib/webcontainer-export'
import { getFolderHandle, ensureFolderPermission } from '@/lib/local-folder'

const WATCH_EXCLUDED_DIRS = new Set(['node_modules', '.git', '.npm', '.cache'])
// Synced to disk but too noisy as editor tabs
const IMPORT_EXCLUDED_DIRS = new Set(['dist', 'build', '.vite'])
const IMPORT_EXCLUDED_FILES = new Set([
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
])
export const MAX_IMPORT_SIZE = 512 * 1024
const FLUSH_MS = 2000

export interface ImportableFile {
  name: string
  content: string
}

interface WatcherCallbacks {
  applyFiles: (files: ImportableFile[]) => void
  getEditorFileNames: () => Set<string>
}

let watcher: { close(): void } | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null
let permissionToastShown = false
const dirtyPaths = new Set<string>()

function hasSegmentIn(path: string, segments: Set<string>): boolean {
  return path.split('/').some((segment) => segments.has(segment))
}

function looksBinary(data: Uint8Array): boolean {
  const probe = Math.min(data.length, 1024)
  for (let i = 0; i < probe; i++) {
    if (data[i] === 0) return true
  }
  return false
}

export function isImportable(path: string, data: Uint8Array): boolean {
  if (hasSegmentIn(path, IMPORT_EXCLUDED_DIRS)) return false
  const fileName = path.slice(path.lastIndexOf('/') + 1)
  if (IMPORT_EXCLUDED_FILES.has(fileName)) return false
  return data.length <= MAX_IMPORT_SIZE && !looksBinary(data)
}

// Watch events often carry a directory name even when the change happened to
// a file inside it (e.g. npm rewriting vite-app/package.json reports
// "vite-app"), and WebContainer's readFile on a directory returns empty bytes
// instead of throwing — so directories must be detected and expanded into
// their contained files, never treated as files themselves.
async function collectDirtyFiles(
  container: WebContainer,
  paths: string[]
): Promise<Map<string, Uint8Array>> {
  const files = new Map<string, Uint8Array>()

  async function expandDir(dirPath: string): Promise<boolean> {
    let entries
    try {
      entries = await container.fs.readdir(dirPath, { withFileTypes: true })
    } catch {
      return false
    }
    for (const entry of entries) {
      if (WATCH_EXCLUDED_DIRS.has(entry.name)) continue
      const childPath = `${dirPath}/${entry.name}`
      if (entry.isDirectory()) {
        await expandDir(childPath)
      } else if (!files.has(childPath)) {
        try {
          files.set(childPath, await container.fs.readFile(childPath))
        } catch {
          // removed mid-scan
        }
      }
    }
    return true
  }

  for (const path of paths) {
    let data: Uint8Array | null = null
    try {
      data = await container.fs.readFile(path)
    } catch {
      // deleted
    }
    if (data && data.length > 0) {
      files.set(path, data)
      continue
    }
    const wasDirectory = await expandDir(path)
    if (!wasDirectory && data) files.set(path, data)
  }
  return files
}

async function flush(
  container: WebContainer,
  roomId: string,
  callbacks: WatcherCallbacks
): Promise<void> {
  const paths = Array.from(dirtyPaths)
  dirtyPaths.clear()

  const editorNames = callbacks.getEditorFileNames()
  const dirtyFiles = await collectDirtyFiles(container, paths)
  const applies: ImportableFile[] = []
  const diskWrites: { path: string; data: Uint8Array }[] = []

  for (const [path, data] of dirtyFiles) {
    diskWrites.push({ path, data })
    if (isSelfContainerWrite(path, data)) continue
    if (editorNames.has(path)) {
      // Terminal/process change to an editor-managed file (e.g. npm
      // rewriting package.json) — sync it back into Yjs
      if (data.length <= MAX_IMPORT_SIZE && !looksBinary(data)) {
        applies.push({ name: path, content: new TextDecoder().decode(data) })
      }
    } else if (isImportable(path, data)) {
      applies.push({ name: path, content: new TextDecoder().decode(data) })
    }
  }

  if (applies.length > 0) callbacks.applyFiles(applies)

  const handle = await getFolderHandle(roomId).catch(() => null)
  if (!handle) return

  if (await ensureFolderPermission(handle, false)) {
    for (const write of diskWrites) {
      try {
        await writeDiskFile(handle, write.path, write.data)
      } catch {
        // folder moved/deleted — manual export will surface the error
      }
    }
  } else if (!permissionToastShown) {
    // Browser dropped the persisted permission — re-granting needs a click
    permissionToastShown = true
    toast(`Folder "${handle.name}" needs permission to auto-save`, {
      duration: 15000,
      action: {
        label: 'Grant',
        onClick: () => {
          void ensureFolderPermission(handle, true).then(async (granted) => {
            if (!granted) return
            const count = await exportContainerToFolder(handle).catch(
              () => null
            )
            if (count !== null) {
              toast.success(
                `Saved ${count} file${count === 1 ? '' : 's'} to "${handle.name}"`
              )
            }
          })
        },
      },
    })
  }
}

export function startProjectWatcher(
  roomId: string,
  callbacks: WatcherCallbacks
): void {
  const booted = getBootedWebContainer()
  if (!booted || watcher) return

  void booted
    .then((container) => {
      if (watcher) return
      watcher = container.fs.watch(
        '.',
        { recursive: true },
        (_event, filename) => {
          const raw =
            typeof filename === 'string'
              ? filename
              : new TextDecoder().decode(filename)
          const path = sanitizeFilePath(raw)
          if (!path || hasSegmentIn(path, WATCH_EXCLUDED_DIRS)) return
          dirtyPaths.add(path)
          if (flushTimer) clearTimeout(flushTimer)
          flushTimer = setTimeout(() => {
            flushTimer = null
            flush(container, roomId, callbacks).catch(() => undefined)
          }, FLUSH_MS)
        }
      )
    })
    .catch(() => undefined)
}

export function stopProjectWatcher(): void {
  watcher?.close()
  watcher = null
  if (flushTimer) clearTimeout(flushTimer)
  flushTimer = null
  permissionToastShown = false
  dirtyPaths.clear()
}
