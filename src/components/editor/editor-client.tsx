'use client'

import { useCallback, useEffect, useRef } from 'react'
import Editor, { loader, type OnMount } from '@monaco-editor/react'
import type * as MonacoEditor from 'monaco-editor'
import { useEditorStore, type EditorFile } from '@/stores/editor-store'
import { toast } from 'sonner'
import { colorFromUserId } from '@/lib/color'
import { useIsMobile } from '@/hooks/use-is-mobile'
import { getBootedWebContainer } from '@/lib/webcontainer'
import {
  mountAllFiles,
  writeContainerFile,
  removeContainerFile,
  sanitizeFilePath,
} from '@/lib/webcontainer-fs'
import {
  autoRestoreLinkedFolder,
  deleteFromLinkedFolder,
} from '@/lib/webcontainer-export'
import {
  startProjectWatcher,
  stopProjectWatcher,
} from '@/lib/webcontainer-watch'
import {
  startLocalFolderWatcher,
  stopLocalFolderWatcher,
} from '@/lib/local-folder-watch'

loader.config({
  paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs' },
})

interface EditorClientProps {
  roomId: string
  userId: string
  userName?: string
  initialLanguage?: string
  readOnly?: boolean
}

const LANG_EXT: Record<string, string> = {
  javascript: 'js',
  typescript: 'ts',
  python: 'py',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'cs',
  go: 'go',
  rust: 'rs',
  ruby: 'rb',
  php: 'php',
  swift: 'swift',
  kotlin: 'kt',
  scala: 'scala',
  r: 'r',
  sql: 'sql',
  bash: 'sh',
  lua: 'lua',
  perl: 'pl',
  haskell: 'hs',
  elixir: 'ex',
  clojure: 'clj',
  dart: 'dart',
  julia: 'jl',
  matlab: 'm',
  vbnet: 'vb',
  cobol: 'cob',
  fortran: 'f90',
  assembly: 'asm',
}

const MONACO_LANG_MAP: Record<string, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  csharp: 'csharp',
  go: 'go',
  rust: 'rust',
  ruby: 'ruby',
  php: 'php',
  swift: 'swift',
  kotlin: 'kotlin',
  scala: 'scala',
  r: 'r',
  sql: 'sql',
  bash: 'shell',
  lua: 'lua',
  perl: 'perl',
  haskell: 'haskell',
  elixir: 'elixir',
  clojure: 'clojure',
  dart: 'dart',
  julia: 'julia',
  matlab: 'matlab',
  vbnet: 'vb',
  cobol: 'cobol',
  fortran: 'fortran',
  assembly: 'asm',
}

interface FileMetadata {
  id: string
  name: string
  language: string
  order: number
}

interface YMap {
  set(key: string, value: string): void
  get(key: string): string | undefined
  delete(key: string): void
  forEach(fn: (val: string, key: string) => void): void
  observe(fn: () => void): void
  unobserve(fn: () => void): void
  readonly size: number
}

interface YText {
  insert(index: number, content: string): void
  delete(index: number, length: number): void
  toString(): string
  readonly length: number
  observe(fn: () => void): void
  unobserve(fn: () => void): void
}

interface YArray<T> {
  push(content: T[]): void
  toArray(): T[]
  observe(fn: () => void): void
  unobserve(fn: () => void): void
}

interface YDoc {
  clientID: number
  getMap(name: string): YMap
  getText(name: string): YText
  getArray<T>(name: string): YArray<T>
  transact(fn: () => void): void
  destroy(): void
}

// Module-level refs — only one EditorClient exists per page
let _editor: {
  getModel(): { getValue(): string } | null
  setModel(model: unknown): void
  addCommand(keybinding: number, handler: () => void): unknown
} | null = null

let _ydoc: YDoc | null = null
let _encodeStateAsUpdate: ((doc: unknown) => Uint8Array) | null = null

export function getYjsStateBytes(): Uint8Array | null {
  if (!_ydoc || !_encodeStateAsUpdate) return null
  return _encodeStateAsUpdate(_ydoc)
}

// Module-level registry — subscriptions registered before ydoc is ready still work
const executionResultSubscribers = new Set<(result: unknown) => void>()

export interface ChatMessageData {
  id: string
  userId: string
  userName: string
  content: string
  timestamp: number
  type?: 'text' | 'code'
  language?: string
}

// Chat subscribers — same pattern as execution results
const chatMessageSubscribers = new Set<(msgs: ChatMessageData[]) => void>()

export function sendChatMessage(data: ChatMessageData): void {
  if (!_ydoc) return
  _ydoc.getArray<ChatMessageData>('chat-messages').push([data])
}

export function getChatMessages(): ChatMessageData[] {
  if (!_ydoc) return []
  return _ydoc.getArray<ChatMessageData>('chat-messages').toArray()
}

export function subscribeToChatMessages(
  callback: (msgs: ChatMessageData[]) => void
): () => void {
  chatMessageSubscribers.add(callback)
  return () => chatMessageSubscribers.delete(callback)
}

// Guard against double-destroy on MonacoBinding (yjs throws if handler already removed)
const _destroyedBindings = new WeakSet<object>()
function safeDestroyBinding(binding: unknown): void {
  if (!binding || _destroyedBindings.has(binding as object)) return
  _destroyedBindings.add(binding as object)
  ;(binding as { destroy(): void }).destroy()
}

export function getEditorContent(): string {
  return _editor?.getModel()?.getValue() ?? ''
}

export function getAllFilesContent(): { name: string; content: string }[] {
  const { files } = useEditorStore.getState()
  if (!_ydoc) return files.map((f) => ({ name: f.name, content: f.content }))
  return files.map((file) => ({
    name: file.name,
    content: _ydoc!.getText(`file:${file.id}`).toString(),
  }))
}

export function broadcastExecutionResult(result: unknown): void {
  _ydoc?.getMap('execution-results').set('latest', JSON.stringify(result))
}

export function subscribeToExecutionResults(
  callback: (result: unknown) => void
): () => void {
  executionResultSubscribers.add(callback)
  return () => executionResultSubscribers.delete(callback)
}

export function addSharedFile(file: EditorFile): void {
  if (!_ydoc) return
  const fileList = _ydoc.getMap('file-list')
  let maxOrder = -1
  fileList.forEach((val) => {
    try {
      const m = JSON.parse(val) as FileMetadata
      if ((m.order ?? 0) > maxOrder) maxOrder = m.order ?? 0
    } catch {}
  })
  fileList.set(
    file.id,
    JSON.stringify({
      id: file.id,
      name: file.name,
      language: file.language,
      order: maxOrder + 1,
    })
  )
}

export function removeSharedFile(id: string): void {
  if (!_ydoc) return
  _ydoc.getMap('file-list').delete(id)
}

/**
 * Deletes a file, but never empties the room: when removing the last remaining
 * file it first seeds a fresh blank file (a non-colliding `main.js`) so the
 * workspace always has ≥1 file — Monaco always has a model and the file-list
 * never hits the empty state that would otherwise leave the editor broken.
 */
export function deleteSharedFile(id: string): void {
  const store = useEditorStore.getState()
  if (store.files.length <= 1) {
    const taken = new Set(store.files.map((f) => f.name))
    let name = 'main.js'
    for (let n = 1; taken.has(name); n++) name = `main${n}.js`
    const seed: EditorFile = {
      id: crypto.randomUUID(),
      name,
      content: '',
      language: 'javascript',
    }
    addSharedFile(seed)
    store.addFile(seed)
    store.setActiveFile(seed.id)
  }
  removeSharedFile(id)
  store.removeFile(id)
}

export function renameSharedFile(id: string, name: string): void {
  if (!_ydoc) return
  const fileList = _ydoc.getMap('file-list')
  const raw = fileList.get(id)
  if (!raw) return
  const meta = JSON.parse(raw) as FileMetadata
  const language = languageFromFileName(name) ?? meta.language
  fileList.set(id, JSON.stringify({ ...meta, name, language }))
}

const EXT_LANG: Record<string, string> = {
  ts: 'typescript',
  tsx: 'typescript',
  mts: 'typescript',
  js: 'javascript',
  jsx: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  json: 'json',
  css: 'css',
  scss: 'css',
  html: 'html',
  svg: 'html',
  md: 'markdown',
  yml: 'yaml',
  yaml: 'yaml',
  py: 'python',
  java: 'java',
  cpp: 'cpp',
  cc: 'cpp',
  hpp: 'cpp',
  c: 'c',
  h: 'c',
  cs: 'csharp',
  go: 'go',
  rs: 'rust',
  rb: 'ruby',
  php: 'php',
  swift: 'swift',
  kt: 'kotlin',
  scala: 'scala',
  r: 'r',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  lua: 'lua',
  pl: 'perl',
  hs: 'haskell',
  ex: 'elixir',
  exs: 'elixir',
  clj: 'clojure',
  dart: 'dart',
  jl: 'julia',
}

export function languageFromFileName(name: string): string | null {
  const dot = name.lastIndexOf('.')
  if (dot === -1) return null
  return EXT_LANG[name.slice(dot + 1).toLowerCase()] ?? null
}

export function getLanguageStats(): { language: string; bytes: number }[] {
  const { files } = useEditorStore.getState()
  const totals = new Map<string, number>()
  for (const file of files) {
    const bytes = _ydoc
      ? _ydoc.getText(`file:${file.id}`).length
      : file.content.length
    if (bytes === 0) continue
    totals.set(file.language, (totals.get(file.language) ?? 0) + bytes)
  }
  return Array.from(totals, ([language, bytes]) => ({ language, bytes })).sort(
    (a, b) => b.bytes - a.bytes
  )
}

export function importFilesToWorkspace(
  files: { name: string; content: string }[]
): number {
  const ydoc = _ydoc
  if (!ydoc) return 0
  const fileList = ydoc.getMap('file-list')
  const existingNames = new Set<string>()
  let maxOrder = -1
  fileList.forEach((val) => {
    try {
      const meta = JSON.parse(val) as FileMetadata
      existingNames.add(meta.name)
      if ((meta.order ?? 0) > maxOrder) maxOrder = meta.order ?? 0
    } catch {}
  })

  let added = 0
  ydoc.transact(() => {
    for (const file of files) {
      if (existingNames.has(file.name)) continue
      const id = crypto.randomUUID()
      fileList.set(
        id,
        JSON.stringify({
          id,
          name: file.name,
          language: languageFromFileName(file.name) ?? 'plaintext',
          order: ++maxOrder,
        })
      )
      const ytext = ydoc.getText(`file:${id}`)
      if (ytext.length === 0) ytext.insert(0, file.content)
      added++
    }
  })
  return added
}

export function applyExternalFileContents(
  files: { name: string; content: string }[]
): { updated: number; added: number } {
  const ydoc = _ydoc
  if (!ydoc) return { updated: 0, added: 0 }
  const fileList = ydoc.getMap('file-list')
  const idsByName = new Map<string, string>()
  fileList.forEach((val) => {
    try {
      const meta = JSON.parse(val) as FileMetadata
      const path = sanitizeFilePath(meta.name)
      if (path) idsByName.set(path, meta.id)
    } catch {}
  })

  let updated = 0
  const toAdd: { name: string; content: string }[] = []
  ydoc.transact(() => {
    for (const file of files) {
      const id = idsByName.get(file.name)
      if (!id) {
        toAdd.push(file)
        continue
      }
      const ytext = ydoc.getText(`file:${id}`)
      if (ytext.toString() === file.content) continue
      ytext.delete(0, ytext.length)
      ytext.insert(0, file.content)
      updated++
    }
  })
  const added = toAdd.length > 0 ? importFilesToWorkspace(toAdd) : 0
  return { updated, added }
}

export function EditorClient({
  roomId,
  userId,
  userName,
  initialLanguage,
  readOnly = false,
}: EditorClientProps) {
  const cleanupRef = useRef<(() => void) | null>(null)
  // true = no active binding / already destroyed; prevents double-destroy
  const bindingDestroyedRef = useRef(true)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const editorRef = useRef<any>(null)
  const ydocRef = useRef<YDoc | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const providerRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const monacoApiRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const MonacoBindingClassRef = useRef<any>(null)
  // Maps fileId → ITextModel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelsRef = useRef<Map<string, any>>(new Map())
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const activeBindingRef = useRef<any>(null)
  const completionProviderRef = useRef<{ dispose(): void } | null>(null)

  const isMobile = useIsMobile()

  const {
    theme,
    language,
    lineNumbers,
    minimap,
    wordWrap,
    fontSize,
    setLanguage,
    setLastSaved,
    renameFile,
    files,
    inlineSuggest,
  } = useEditorStore()

  // Activate a file: switch Monaco model + create new MonacoBinding
  const activateFile = useCallback((fileId: string) => {
    const editor = editorRef.current
    const ydoc = ydocRef.current
    const provider = providerRef.current
    const monacoApi = monacoApiRef.current
    const MonacoBindingClass = MonacoBindingClassRef.current
    if (!editor || !ydoc || !monacoApi || !MonacoBindingClass) return

    const prevBinding = activeBindingRef.current
    activeBindingRef.current = null
    if (prevBinding && !bindingDestroyedRef.current) {
      bindingDestroyedRef.current = true
      safeDestroyBinding(prevBinding)
    }

    const { files: currentFiles } = useEditorStore.getState()
    const file = currentFiles.find((f) => f.id === fileId)
    if (!file) return

    const ytext = ydoc.getText(`file:${fileId}`)

    let model = modelsRef.current.get(fileId)
    if (!model) {
      model = monacoApi.editor.createModel(
        ytext.toString(),
        MONACO_LANG_MAP[file.language] ?? file.language,
        monacoApi.Uri.parse(`inmemory://coder/${fileId}`)
      )
      modelsRef.current.set(fileId, model)
    } else {
      // Sync model with latest ytext content (may have changed while inactive)
      const latest = ytext.toString()
      if (model.getValue() !== latest) {
        model.setValue(latest)
      }
    }

    editor.setModel(model)

    activeBindingRef.current = new MonacoBindingClass(
      ytext,
      model,
      new Set([editor]),
      provider?.awareness
    )
    bindingDestroyedRef.current = false
  }, [])

  // Switch Monaco model whenever activeFileId changes in the store
  useEffect(() => {
    return useEditorStore.subscribe((state, prev) => {
      if (state.activeFileId !== prev.activeFileId && state.activeFileId) {
        activateFile(state.activeFileId)
      }
    })
  }, [activateFile])

  // Update Monaco model language + Yjs file-list when toolbar language changes
  useEffect(() => {
    const { activeFileId } = useEditorStore.getState()
    if (!activeFileId || !monacoApiRef.current || !ydocRef.current) return
    const model = modelsRef.current.get(activeFileId)
    if (!model) return

    monacoApiRef.current.editor.setModelLanguage(
      model,
      MONACO_LANG_MAP[language] ?? language
    )

    const fileList = ydocRef.current.getMap('file-list')
    const raw = fileList.get(activeFileId)
    if (raw) {
      const meta = JSON.parse(raw) as FileMetadata
      if (meta.language !== language) {
        fileList.set(activeFileId, JSON.stringify({ ...meta, language }))
      }
    }
  }, [language])

  // Rename default file to match initial language on first load
  useEffect(() => {
    if (!initialLanguage) return
    setLanguage(initialLanguage)
    const defaultFile = files.find((f) => f.id === 'default')
    if (defaultFile && defaultFile.name === 'main.js') {
      const ext = LANG_EXT[initialLanguage] ?? 'txt'
      renameFile('default', `main.${ext}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialLanguage])

  const handleEditorMount: OnMount = useCallback(
    async (editor, monaco) => {
      editorRef.current = editor
      monacoApiRef.current = monaco
      _editor = editor as typeof _editor

      // Clicking the editor doesn't always steal focus back from xterm —
      // keystrokes kept landing in the terminal's stdin
      editor.onMouseDown(() => {
        if (!editor.hasTextFocus()) editor.focus()
      })

      completionProviderRef.current =
        monaco.languages.registerInlineCompletionsProvider('*', {
          provideInlineCompletions: async (
            model: MonacoEditor.editor.ITextModel,
            position: MonacoEditor.Position,
            _context: MonacoEditor.languages.InlineCompletionContext,
            token: MonacoEditor.CancellationToken
          ) => {
            // Debounce — Monaco cancels stale calls via token when user keeps typing
            await new Promise<void>((resolve) => setTimeout(resolve, 300))
            if (token.isCancellationRequested) return { items: [] }

            const offset = model.getOffsetAt(position)
            const fullText = model.getValue()
            const prefix = fullText.slice(0, offset)
            const suffix = fullText.slice(offset)
            const language = model.getLanguageId() as string

            // Skip blank lines — avoid triggering on Enter
            if (/\n\s*$/.test(prefix)) return { items: [] }

            // Other open files for cross-file context (exclude active)
            const { files: wsFiles, activeFileId } = useEditorStore.getState()
            const otherFiles = wsFiles
              .filter((f) => f.id !== activeFileId)
              .map((f) => ({
                name: f.name,
                content: _ydoc
                  ? _ydoc.getText(`file:${f.id}`).toString()
                  : f.content,
              }))
              .filter((f) => f.content.trim().length > 0)

            try {
              const res = await fetch('/api/ai/complete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prefix, suffix, language, otherFiles }),
              })
              if (token.isCancellationRequested) return { items: [] }
              const { completion } = (await res.json()) as {
                completion: string
              }
              if (!completion) return { items: [] }
              return {
                items: [
                  {
                    insertText: completion,
                    range: {
                      startLineNumber: position.lineNumber,
                      startColumn: position.column,
                      endLineNumber: position.lineNumber,
                      endColumn: position.column,
                    },
                  },
                ],
              }
            } catch {
              return { items: [] }
            }
          },
          freeInlineCompletions: () => {},
          disposeInlineCompletions: () => {},
        })

      const [Y, { WebsocketProvider }, { MonacoBinding }] = await Promise.all([
        import('yjs'),
        import('y-websocket'),
        import('y-monaco'),
      ])

      const encodeV2 = Y.encodeStateAsUpdateV2 as (doc: unknown) => Uint8Array
      // Tagged V2 container (uncompressed): [0x59, 0x5A, FLAG_V2]. Matches
      // collab-server/coder decoders. No gzip here — keeps zlib out of the client bundle.
      _encodeStateAsUpdate = (doc: unknown) => {
        const update = encodeV2(doc)
        const out = new Uint8Array(3 + update.length)
        out[0] = 0x59
        out[1] = 0x5a
        out[2] = 0x01
        out.set(update, 3)
        return out
      }
      MonacoBindingClassRef.current = MonacoBinding

      editor.addCommand(2048 | 49, () => setLastSaved(new Date()))

      const wsUrl =
        process.env.NEXT_PUBLIC_COLLAB_WS_URL ?? 'ws://localhost:1234'

      const ydoc = new Y.Doc()
      _ydoc = ydoc
      ydocRef.current = ydoc

      const execResultsMap = ydoc.getMap<string>('execution-results')
      const execResultsObserver = () => {
        const raw = execResultsMap.get('latest')
        if (raw) {
          const result = JSON.parse(raw) as unknown
          executionResultSubscribers.forEach((cb) => cb(result))
        }
      }
      execResultsMap.observe(execResultsObserver)

      const chatArray = ydoc.getArray<ChatMessageData>('chat-messages')
      const chatObserver = () => {
        const msgs = chatArray.toArray()
        chatMessageSubscribers.forEach((cb) => cb(msgs))
      }
      chatArray.observe(chatObserver)

      const provider = new WebsocketProvider(wsUrl, roomId, ydoc, {
        connect: true,
        resyncInterval: 10_000,
        maxBackoffTime: 60_000,
      })
      providerRef.current = provider

      provider.awareness.setLocalStateField('user', {
        id: userId,
        name: userName ?? userId,
        color: colorFromUserId(userId),
      })

      const styleEl = document.createElement('style')
      styleEl.id = `y-monaco-cursors-${roomId}`
      document.head.appendChild(styleEl)

      const nameCache = new Map<number, string>()
      let initialized = false

      const handleAwarenessChange = ({
        added,
        removed,
      }: {
        added: number[]
        updated: number[]
        removed: number[]
      }) => {
        const states = provider.awareness.getStates() as Map<
          number,
          {
            user?: { color?: string; name?: string }
            cursor?: { anchor?: unknown; head?: unknown }
          }
        >
        let css = ''
        states.forEach((state, clientId) => {
          if (clientId === ydoc.clientID) return
          const color = state.user?.color ?? '#888888'
          const name = (state.user?.name ?? 'Anonymous').replace(/"/g, '')
          nameCache.set(clientId, name)
          let labelTop = '-1.4em'
          if (state.cursor?.anchor) {
            const absPos = Y.createAbsolutePositionFromRelativePosition(
              state.cursor.anchor as Parameters<
                typeof Y.createAbsolutePositionFromRelativePosition
              >[0],
              ydoc
            )
            const lineNumber = absPos
              ? (editor.getModel()?.getPositionAt(absPos.index).lineNumber ?? 3)
              : 3
            if (lineNumber <= 2) labelTop = '1.4em'
          }
          css += `.yRemoteSelection-${clientId}{background-color:${color}40}
.yRemoteSelectionHead-${clientId}{border-color:${color};background-color:${color}}
.yRemoteSelectionHead-${clientId}::after{content:"${name}";background-color:${color};top:${labelTop}}
`
        })
        styleEl.textContent = css

        if (!initialized) {
          initialized = true
          return
        }

        added.forEach((clientId) => {
          if (clientId === ydoc.clientID) return
          const name = states.get(clientId)?.user?.name ?? 'Someone'
          toast(`${name} joined`)
        })
        removed.forEach((clientId) => {
          if (clientId === ydoc.clientID) return
          const name = nameCache.get(clientId) ?? 'Someone'
          nameCache.delete(clientId)
          toast(`${name} left`)
        })
      }

      provider.awareness.on('change', handleAwarenessChange)
      handleAwarenessChange({ added: [], updated: [], removed: [] })

      provider.on('status', ({ status }: { status: string }) => {
        if (status === 'connected') setLastSaved(new Date())
      })

      // WebContainer VFS sync state — maps live in mount scope so cleanup can reach them
      const vfsRegistry = new Map<
        string,
        { name: string; observer: () => void }
      >()
      const vfsTimers = new Map<string, ReturnType<typeof setTimeout>>()

      // Initialize file list after Yjs doc syncs with server
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(provider as any).once('sync', (synced: boolean) => {
        if (!synced) return

        const fileList = ydoc.getMap('file-list') as unknown as YMap

        const parseEntries = (): FileMetadata[] => {
          const entries: FileMetadata[] = []
          fileList.forEach((val) => {
            try {
              entries.push(JSON.parse(val) as FileMetadata)
            } catch {}
          })
          return entries.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        }

        if (fileList.size === 0) {
          // New room or pre-multi-file room: seed file-list from store
          const { files: storeFiles } = useEditorStore.getState()
          ydoc.transact(() => {
            storeFiles.forEach((file, i) => {
              fileList.set(
                file.id,
                JSON.stringify({
                  id: file.id,
                  name: file.name,
                  language: file.language,
                  order: i,
                })
              )
            })
          })
          // Migrate legacy single-file content (getText('content') → getText('file:default'))
          const legacyText = ydoc.getText('content').toString()
          if (legacyText && storeFiles.length > 0) {
            const defaultYtext = ydoc.getText(`file:${storeFiles[0].id}`)
            if (defaultYtext.length === 0) {
              defaultYtext.insert(0, legacyText)
            }
          }
        } else {
          // Existing room: sync file-list to store
          const entries = parseEntries()
          const {
            setFiles: sf,
            setActiveFile: saf,
            activeFileId: currentActive,
          } = useEditorStore.getState()
          sf(
            entries.map((m) => ({
              id: m.id,
              name: m.name,
              language: m.language,
              content: '',
            }))
          )
          // Activate a valid file
          const validId =
            entries.find((e) => e.id === currentActive)?.id ?? entries[0]?.id
          if (validId) saf(validId)
        }

        // Observer for live file-list changes (local + remote)
        const handleFileListChange = () => {
          const rawEntries = parseEntries()
          // Deduplicate by ID — Yjs map + concurrent addFile calls can produce duplicates
          const entries = Array.from(
            new Map(rawEntries.map((e) => [e.id, e])).values()
          )
          const {
            files: prevFiles,
            activeFileId: currentActiveId,
            setFiles: sf,
            setActiveFile: saf,
            setLanguage: sl,
            language: currentLang,
          } = useEditorStore.getState()

          // Dispose models for removed files
          const newIds = new Set(entries.map((e) => e.id))
          prevFiles.forEach((f) => {
            if (!newIds.has(f.id)) {
              const model = modelsRef.current.get(f.id)
              if (model) {
                // Removing the ACTIVE file: y-monaco auto-destroys the binding
                // via model.onWillDispose — record that destroy in our guards
                // BEFORE dispose, or the later activateFile() destroys it a
                // second time ("[yjs] Tried to remove event handler…")
                if (f.id === currentActiveId) {
                  editorRef.current?.setModel(null)
                  const prevBinding = activeBindingRef.current
                  activeBindingRef.current = null
                  if (prevBinding) {
                    _destroyedBindings.add(prevBinding as object)
                    bindingDestroyedRef.current = true
                  }
                }
                try {
                  if (!model.isDisposed()) model.dispose()
                } catch {}
                modelsRef.current.delete(f.id)
              }
            }
          })

          sf(
            entries.map((m) => ({
              id: m.id,
              name: m.name,
              language: m.language,
              content: '',
            }))
          )

          // If active file was removed, switch to another
          if (currentActiveId && !newIds.has(currentActiveId)) {
            const first = entries[0]
            if (first) saf(first.id)
          }

          // Sync language if remote user changed active file's language
          if (currentActiveId) {
            const entry = entries.find((e) => e.id === currentActiveId)
            if (entry && entry.language !== currentLang) {
              sl(entry.language)
            }
          }
        }

        fileList.observe(handleFileListChange)

        // --- WebContainer VFS sync (no-op unless editor-wrapper booted a container) ---
        const dedupedEntries = () =>
          Array.from(new Map(parseEntries().map((e) => [e.id, e])).values())

        const scheduleContentSync = (id: string) => {
          const pending = vfsTimers.get(id)
          if (pending) clearTimeout(pending)
          vfsTimers.set(
            id,
            setTimeout(() => {
              vfsTimers.delete(id)
              const tracked = vfsRegistry.get(id)
              if (!tracked) return
              void writeContainerFile(
                tracked.name,
                ydoc.getText(`file:${id}`).toString()
              )
            }, 500)
          )
        }

        const attachContentObserver = (id: string, name: string) => {
          const observer = () => scheduleContentSync(id)
          ydoc.getText(`file:${id}`).observe(observer)
          vfsRegistry.set(id, { name, observer })
        }

        const syncFileStructure = () => {
          const entries = dedupedEntries()
          const seen = new Set<string>()
          entries.forEach((entry) => {
            seen.add(entry.id)
            const tracked = vfsRegistry.get(entry.id)
            if (!tracked) {
              attachContentObserver(entry.id, entry.name)
              void writeContainerFile(
                entry.name,
                ydoc.getText(`file:${entry.id}`).toString()
              )
            } else if (tracked.name !== entry.name) {
              void removeContainerFile(tracked.name)
              tracked.name = entry.name
              void writeContainerFile(
                entry.name,
                ydoc.getText(`file:${entry.id}`).toString()
              )
            }
          })
          vfsRegistry.forEach((tracked, id) => {
            if (seen.has(id)) return
            ydoc.getText(`file:${id}`).unobserve(tracked.observer)
            vfsRegistry.delete(id)
            const pending = vfsTimers.get(id)
            if (pending) clearTimeout(pending)
            vfsTimers.delete(id)
            void removeContainerFile(tracked.name)
            void deleteFromLinkedFolder(roomId, tracked.name)
          })
        }

        getBootedWebContainer()
          ?.then((container) => {
            const entries = dedupedEntries()
            void mountAllFiles(
              entries.map((e) => ({
                name: e.name,
                content: ydoc.getText(`file:${e.id}`).toString(),
              }))
            )
            entries.forEach((e) => attachContentObserver(e.id, e.name))
            fileList.observe(syncFileStructure)
            autoRestoreLinkedFolder(roomId).catch(() => undefined)
            const getEditorFileNames = () =>
              new Set(
                useEditorStore
                  .getState()
                  .files.map((f) => sanitizeFilePath(f.name))
                  .filter((name): name is string => name !== null)
              )
            startProjectWatcher(roomId, {
              applyFiles: (files) => {
                const { added } = applyExternalFileContents(files)
                if (added > 0) {
                  toast.info(
                    `${added} file${added === 1 ? '' : 's'} added from the container`
                  )
                }
              },
              getEditorFileNames,
            })
            startLocalFolderWatcher(roomId, {
              applyDiskFiles: (files) => {
                const { added } = applyExternalFileContents(files)
                if (added > 0) {
                  toast.info(
                    `${added} file${added === 1 ? '' : 's'} added from the local folder`
                  )
                }
              },
              getEditorFileNames,
            })
            if (process.env.NODE_ENV === 'development') {
              ;(window as unknown as { __wc?: unknown }).__wc = container
            }
          })
          .catch(() => undefined)

        // Activate the current file now that everything is ready
        const { activeFileId: initialActiveId } = useEditorStore.getState()
        if (initialActiveId) activateFile(initialActiveId)
      })

      cleanupRef.current = () => {
        const editorInstance = _editor
        const fullEditor = editorRef.current
        _editor = null
        _ydoc = null
        ydocRef.current = null
        providerRef.current = null
        editorRef.current = null
        monacoApiRef.current = null
        MonacoBindingClassRef.current = null
        const prevBinding = activeBindingRef.current
        activeBindingRef.current = null
        // 1. destroy yjs binding (guarded — double-destroy throws yjs warning)
        if (prevBinding && !bindingDestroyedRef.current) {
          bindingDestroyedRef.current = true
          safeDestroyBinding(prevBinding)
        }
        // 2. dismiss hover/suggest widgets before detaching model
        try {
          fullEditor?.trigger('source', 'hideSuggestWidget', undefined)
        } catch {}
        // 3. detach model from all editor widgets before dispose
        editorInstance?.setModel(null)
        // 4. dispose each model only after detached
        modelsRef.current.forEach((model) => {
          try {
            if (!model.isDisposed()) model.dispose()
          } catch {}
        })
        modelsRef.current.clear()
        completionProviderRef.current?.dispose()
        completionProviderRef.current = null
        stopProjectWatcher()
        stopLocalFolderWatcher()
        vfsTimers.forEach((timer) => clearTimeout(timer))
        vfsTimers.clear()
        vfsRegistry.clear()
        execResultsMap.unobserve(execResultsObserver)
        chatArray.unobserve(chatObserver)
        provider.awareness.off('change', handleAwarenessChange)
        styleEl.remove()
        provider.destroy()
        ydoc.destroy()
        // 5. dispose Monaco editor last — cancels pending async timers (InstantiationService)
        try {
          fullEditor?.dispose()
        } catch {}
      }
    },
    // activateFile is stable (useCallback with [])
    [roomId, userId, userName, setLastSaved, activateFile]
  )

  useEffect(() => {
    return () => {
      cleanupRef.current?.()
    }
  }, [])

  return (
    <Editor
      height="100%"
      language={MONACO_LANG_MAP[language] ?? language}
      theme={theme}
      onMount={handleEditorMount}
      options={{
        readOnly,
        fontSize: isMobile ? Math.max(fontSize, 14) : fontSize,
        fontFamily: "'JetBrains Mono', monospace",
        lineNumbers: lineNumbers === 'off' ? 'off' : lineNumbers,
        minimap: { enabled: isMobile ? false : minimap },
        folding: !isMobile,
        wordWrap,
        scrollBeyondLastLine: false,
        automaticLayout: true,
        tabSize: 2,
        insertSpaces: true,
        renderWhitespace: 'selection',
        bracketPairColorization: { enabled: true },
        padding: { top: 8 },
        scrollbar: {
          verticalScrollbarSize: 10,
          horizontalScrollbarSize: 10,
        },
        inlineSuggest: { enabled: inlineSuggest, showToolbar: 'onHover' },
      }}
    />
  )
}
