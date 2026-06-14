import type { FileSystemTree, DirectoryNode } from '@webcontainer/api'
import { getBootedWebContainer } from '@/lib/webcontainer'

export interface SyncFile {
  name: string
  content: string
}

// Fingerprints of editor-originated container writes — the fs.watch flush
// skips these so an editor→container write doesn't echo back into Yjs
const selfContainerWrites = new Map<string, string>()

export function contentKey(data: Uint8Array): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < data.length; i++) {
    hash ^= data[i]
    hash = Math.imul(hash, 0x01000193)
  }
  return `${data.length}:${hash >>> 0}`
}

export function isSelfContainerWrite(path: string, data: Uint8Array): boolean {
  return selfContainerWrites.get(path) === contentKey(data)
}

function recordSelfContainerWrite(path: string, content: string): void {
  selfContainerWrites.set(path, contentKey(new TextEncoder().encode(content)))
}

export function sanitizeFilePath(name: string): string | null {
  const path = name.replace(/^\/+/, '')
  if (!path) return null
  const segments = path.split('/')
  if (segments.some((s) => s === '' || s === '.' || s === '..')) return null
  return segments.join('/')
}

export function toFileTree(files: SyncFile[]): FileSystemTree {
  const tree: FileSystemTree = {}
  for (const { name, content } of files) {
    const path = sanitizeFilePath(name)
    if (!path) continue
    const segments = path.split('/')
    let node = tree
    for (const dir of segments.slice(0, -1)) {
      const existing = node[dir]
      if (!existing || !('directory' in existing)) {
        node[dir] = { directory: {} }
      }
      node = (node[dir] as DirectoryNode).directory
    }
    node[segments[segments.length - 1]] = { file: { contents: content } }
  }
  return tree
}

export async function mountAllFiles(files: SyncFile[]): Promise<void> {
  const booted = getBootedWebContainer()
  if (!booted) return
  try {
    const container = await booted
    for (const { name, content } of files) {
      const path = sanitizeFilePath(name)
      if (path) recordSelfContainerWrite(path, content)
    }
    await container.mount(toFileTree(files))
  } catch {
    // container tore down mid-mount — sync is fire-and-forget
  }
}

export async function writeContainerFile(
  name: string,
  content: string
): Promise<void> {
  const booted = getBootedWebContainer()
  if (!booted) return
  const path = sanitizeFilePath(name)
  if (!path) return
  try {
    const container = await booted
    recordSelfContainerWrite(path, content)
    const lastSlash = path.lastIndexOf('/')
    if (lastSlash > 0) {
      await container.fs.mkdir(path.slice(0, lastSlash), { recursive: true })
    }
    await container.fs.writeFile(path, content)
  } catch {
    // path collides with a directory or container tore down — skip
  }
}

export async function removeContainerFile(name: string): Promise<void> {
  const booted = getBootedWebContainer()
  if (!booted) return
  const path = sanitizeFilePath(name)
  if (!path) return
  try {
    const container = await booted
    await container.fs.rm(path, { force: true })
  } catch {
    // already gone or container tore down
  }
}
