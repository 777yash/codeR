import { toast } from 'sonner'
import { getBootedWebContainer } from '@/lib/webcontainer'
import { sanitizeFilePath, contentKey } from '@/lib/webcontainer-fs'
import {
  getFolderHandle,
  ensureFolderPermission,
  isFileSystemAccessSupported,
} from '@/lib/local-folder'
import { useEditorStore } from '@/stores/editor-store'

// node_modules excluded by design: 10k+ files through the browser FS API takes
// minutes — the lockfile is synced instead and `npm install` restores the rest
const EXCLUDED_DIRS = new Set(['node_modules', '.git', '.npm', '.cache'])
const MAX_FILES = 2000

interface ContainerFile {
  path: string
  data: Uint8Array
}

async function collectContainerFiles(): Promise<ContainerFile[] | null> {
  const booted = getBootedWebContainer()
  if (!booted) return null
  const container = await booted
  const files: ContainerFile[] = []

  async function walk(dir: string): Promise<void> {
    const entries = await container.fs.readdir(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (files.length >= MAX_FILES) return
      const path = dir === '.' ? entry.name : `${dir}/${entry.name}`
      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) await walk(path)
      } else {
        files.push({ path, data: await container.fs.readFile(path) })
      }
    }
  }

  await walk('.')
  return files
}

async function getDirectoryForPath(
  root: FileSystemDirectoryHandle,
  path: string
): Promise<{ dir: FileSystemDirectoryHandle; fileName: string }> {
  const segments = path.split('/')
  let dir = root
  for (const segment of segments.slice(0, -1)) {
    try {
      dir = await dir.getDirectoryHandle(segment, { create: true })
    } catch (error) {
      if (error instanceof DOMException && error.name === 'TypeMismatchError') {
        throw new Error(
          `a file named "${segment}" is blocking the "${segments.slice(0, -1).join('/')}" folder — delete it and retry`
        )
      }
      throw error
    }
  }
  return { dir, fileName: segments[segments.length - 1] }
}

// Fingerprints of our own disk writes — the local folder poller skips these
// so an editor→disk auto-save doesn't echo back as a stale disk→editor edit
const selfWrites = new Map<string, string>()

export function isSelfWrite(path: string, data: Uint8Array): boolean {
  return selfWrites.get(path) === contentKey(data)
}

export async function writeDiskFile(
  root: FileSystemDirectoryHandle,
  path: string,
  data: Uint8Array | string
): Promise<void> {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  selfWrites.set(path, contentKey(bytes))
  const { dir, fileName } = await getDirectoryForPath(root, path)
  const fileHandle = await dir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(bytes as FileSystemWriteChunkType)
  await writable.close()
}

export async function deleteDiskFile(
  root: FileSystemDirectoryHandle,
  path: string
): Promise<void> {
  const segments = path.split('/')
  const chain: FileSystemDirectoryHandle[] = [root]
  let dir = root
  for (const segment of segments.slice(0, -1)) {
    dir = await dir.getDirectoryHandle(segment)
    chain.push(dir)
  }
  await dir.removeEntry(segments[segments.length - 1])
  selfWrites.delete(path)

  // Prune now-empty parent directories (deepest first) so deleting the last
  // file in a folder doesn't leave an empty folder on disk. Never touches root.
  for (let depth = chain.length - 1; depth >= 1; depth--) {
    const iter = chain[depth].values()
    if (!(await iter.next()).done) break
    await chain[depth - 1].removeEntry(segments[depth - 1])
  }
}

export async function deleteFromLinkedFolder(
  roomId: string,
  name: string
): Promise<void> {
  if (!isFileSystemAccessSupported()) return
  const path = sanitizeFilePath(name)
  if (!path) return
  const handle = await getFolderHandle(roomId).catch(() => null)
  if (!handle) return
  if (!(await ensureFolderPermission(handle, false))) return
  await deleteDiskFile(handle, path).catch(() => undefined)
}

export async function exportContainerToFolder(
  root: FileSystemDirectoryHandle
): Promise<number | null> {
  const files = await collectContainerFiles()
  if (files === null) return null
  for (const file of files) {
    await writeDiskFile(root, file.path, file.data)
  }
  return files.length
}

export async function exportFilesToFolder(
  root: FileSystemDirectoryHandle,
  files: { name: string; content: string }[]
): Promise<number> {
  let written = 0
  for (const file of files) {
    const path = sanitizeFilePath(file.name)
    if (!path) continue
    await writeDiskFile(root, path, file.content)
    written++
  }
  return written
}

export async function restoreFolderIntoContainer(
  root: FileSystemDirectoryHandle,
  excludeNames: Set<string>
): Promise<number | null> {
  const booted = getBootedWebContainer()
  if (!booted) return null
  const container = await booted
  let restored = 0

  async function walk(
    dir: FileSystemDirectoryHandle,
    prefix: string
  ): Promise<void> {
    for await (const entry of dir.values()) {
      if (restored >= MAX_FILES) return
      const path = prefix ? `${prefix}/${entry.name}` : entry.name
      if (entry.kind === 'directory') {
        if (!EXCLUDED_DIRS.has(entry.name)) {
          await walk(entry as FileSystemDirectoryHandle, path)
        }
      } else {
        // Yjs-managed editor files win — only container-side artifacts restore
        if (excludeNames.has(path)) continue
        const file = await (entry as FileSystemFileHandle).getFile()
        const data = new Uint8Array(await file.arrayBuffer())
        const lastSlash = path.lastIndexOf('/')
        if (lastSlash > 0) {
          await container.fs.mkdir(path.slice(0, lastSlash), {
            recursive: true,
          })
        }
        await container.fs.writeFile(path, data)
        restored++
      }
    }
  }

  await walk(root, '')
  return restored
}

function currentEditorFileNames(): Set<string> {
  return new Set(
    useEditorStore
      .getState()
      .files.map((f) => sanitizeFilePath(f.name))
      .filter((name): name is string => name !== null)
  )
}

export function restoreWithEditorExclusions(
  handle: FileSystemDirectoryHandle
): Promise<number | null> {
  return restoreFolderIntoContainer(handle, currentEditorFileNames())
}

export async function autoRestoreLinkedFolder(roomId: string): Promise<void> {
  if (!isFileSystemAccessSupported()) return
  const handle = await getFolderHandle(roomId).catch(() => null)
  if (!handle) return

  const restore = async () => {
    const restored = await restoreFolderIntoContainer(
      handle,
      currentEditorFileNames()
    ).catch(() => null)
    if (restored !== null) {
      toast.success(
        `Restored ${restored} file${restored === 1 ? '' : 's'} from "${handle.name}"`
      )
    }
  }

  if (await ensureFolderPermission(handle, false)) {
    await restore()
  } else {
    // Permission re-grant needs a user gesture — offer it via toast action
    toast(`Project folder "${handle.name}" is linked`, {
      action: {
        label: 'Restore',
        onClick: () => {
          void ensureFolderPermission(handle, true).then((granted) => {
            if (granted) void restore()
          })
        },
      },
    })
  }
}
