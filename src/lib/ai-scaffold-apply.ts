import {
  applyExternalFileContents,
  removeSharedFile,
  getAllFilesContent,
} from '@/components/editor/editor-client'
import { writeContainerFile } from '@/lib/webcontainer-fs'
import { getWebContainerStatus } from '@/lib/webcontainer'
import { normalizeNpxCommand } from '@/lib/webcontainer-run'
import { runInTerminal } from '@/components/editor/terminal-panel'
import { useEditorStore } from '@/stores/editor-store'

export interface ScaffoldCommand {
  mainItem: string
  commands: string[]
}

export interface ScaffoldFile {
  filename: string
  contents: string
}

/**
 * The model sometimes double-escapes a file's contents — most often a .json
 * file (package.json comes back as `{\n  \"name\"...}` with literal backslashes
 * that fail JSON.parse). If a .json file isn't valid JSON but decodes to valid
 * JSON after one unescape pass, return the decoded text. Everything else passes
 * through untouched.
 */
export function fixJsonContent(filename: string, content: string): string {
  if (!filename.endsWith('.json')) return content
  try {
    JSON.parse(content)
    return content
  } catch {
    /* not valid as-is — try a single unescape below */
  }
  try {
    const decoded = JSON.parse(`"${content}"`)
    if (typeof decoded === 'string') {
      JSON.parse(decoded)
      return decoded
    }
  } catch {
    /* leave as-is */
  }
  return content
}

export interface ScaffoldResponse {
  mode?: 'chat' | 'scaffold'
  text: string
  files: ScaffoldFile[]
  buildCommand: ScaffoldCommand
  startCommand: ScaffoldCommand
  actions?: { type: string; filename: string }[]
}

/**
 * Applies a scaffold to the shared Yjs workspace: deletes any files named in
 * `actions`, then adds/updates the generated files. Mutations sync to all
 * collaborators via Yjs. Returns the count of files written.
 *
 * `fresh` = destructive replace: remove every existing file not in the
 * generated set before applying (used after an explicit "Replace" confirm).
 * Otherwise non-destructive, with one exception — a greenfield apply (the
 * workspace held only empty placeholder files) clears those leftover empties
 * so a fresh room's seed `main.js` doesn't linger beside the generated tree.
 */
export function applyScaffold(
  scaffold: ScaffoldResponse,
  { fresh = false }: { fresh?: boolean } = {}
): number {
  const { files: storeFiles } = useEditorStore.getState()
  const generatedNames = new Set(scaffold.files.map((f) => f.filename))

  // The store mirrors only id/name/language — file CONTENT lives in Yjs, so
  // store.content is always ''. Read the real content here, or every cleanup
  // below would treat a full project as empty and delete it.
  const contentByName = new Map(
    getAllFilesContent().map((f) => [f.name, f.content])
  )
  const isEmpty = (name: string) =>
    (contentByName.get(name) ?? '').trim() === ''
  const wasGreenfield = [...contentByName.values()].every(
    (c) => c.trim() === ''
  )

  for (const action of scaffold.actions ?? []) {
    if (action.type !== 'delete') continue
    const target = storeFiles.find((f) => f.name === action.filename)
    if (target) removeSharedFile(target.id)
  }

  if (fresh) {
    for (const f of storeFiles) {
      if (!generatedNames.has(f.name)) removeSharedFile(f.id)
    }
  }

  const files = scaffold.files.map((f) => ({
    name: f.filename,
    content: fixJsonContent(f.filename, f.contents),
  }))
  const { updated, added } = applyExternalFileContents(files)

  // Only on a truly empty room: drop leftover empty placeholders (the seed
  // main.js) the scaffold didn't regenerate. Never touch files with content.
  if (!fresh && wasGreenfield && updated + added > 0) {
    for (const f of storeFiles) {
      if (isEmpty(f.name) && !generatedNames.has(f.name)) {
        removeSharedFile(f.id)
      }
    }
  }

  return updated + added
}

export function formatCommand(cmd: ScaffoldCommand | undefined): string | null {
  if (!cmd?.mainItem) return null
  return [cmd.mainItem, ...(cmd.commands ?? [])].join(' ').trim()
}

/**
 * Writes the scaffolded files straight into the container (bypassing the 500ms
 * VFS debounce so the run doesn't race the file sync), then injects
 * `<build> && <start>` into the terminal. No-op when the runtime isn't ready —
 * the files are still applied, the user can Run manually later.
 */
export async function runScaffold(
  scaffold: ScaffoldResponse
): Promise<boolean> {
  // No files generated (e.g. a delete-only request) → nothing to run, even
  // though the model may still have filled in build/start commands.
  if (scaffold.files.length === 0) return false
  if (getWebContainerStatus() !== 'ready') return false

  await Promise.all(
    scaffold.files.map((f) =>
      writeContainerFile(f.filename, fixJsonContent(f.filename, f.contents))
    )
  )

  const build = formatCommand(scaffold.buildCommand)
  const start = formatCommand(scaffold.startCommand)
  const combined = [build, start].filter(Boolean).join(' && ')
  if (!combined) return false

  runInTerminal(normalizeNpxCommand(combined))
  return true
}
