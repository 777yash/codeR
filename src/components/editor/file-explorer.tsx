'use client'

import { useEditorStore, type EditorFile } from '@/stores/editor-store'
import {
  addSharedFile,
  removeSharedFile,
  renameSharedFile,
  importFilesToWorkspace,
  getAllFilesContent,
} from '@/components/editor/editor-client'
import {
  FileCode,
  Plus,
  Folder,
  FolderOpen,
  Trash2,
  ChevronRight,
  ChevronDown,
  Copy,
  CopyPlus,
  Download,
  FilePlus,
  Pencil,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { toast } from 'sonner'

const EXT_TO_LANG: Record<string, string> = {
  js: 'javascript',
  ts: 'typescript',
  tsx: 'typescript',
  jsx: 'javascript',
  py: 'python',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
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
  lua: 'lua',
  pl: 'perl',
  hs: 'haskell',
  ex: 'elixir',
  dart: 'dart',
  jl: 'julia',
  m: 'matlab',
  vb: 'vbnet',
  cob: 'cobol',
  f90: 'fortran',
}

function extToLang(ext: string): string {
  return EXT_TO_LANG[ext] ?? 'javascript'
}

function baseName(name: string): string {
  return name.slice(name.lastIndexOf('/') + 1)
}

interface TreeFolder {
  name: string
  path: string
  folders: TreeFolder[]
  files: EditorFile[]
}

function buildTree(files: EditorFile[]): TreeFolder {
  const root: TreeFolder = { name: '', path: '', folders: [], files: [] }
  const dirMap = new Map<string, TreeFolder>([['', root]])

  const getDir = (path: string): TreeFolder => {
    const existing = dirMap.get(path)
    if (existing) return existing
    const slash = path.lastIndexOf('/')
    const parent = getDir(slash === -1 ? '' : path.slice(0, slash))
    const folder: TreeFolder = {
      name: slash === -1 ? path : path.slice(slash + 1),
      path,
      folders: [],
      files: [],
    }
    parent.folders.push(folder)
    dirMap.set(path, folder)
    return folder
  }

  for (const file of files) {
    const slash = file.name.lastIndexOf('/')
    getDir(slash === -1 ? '' : file.name.slice(0, slash)).files.push(file)
  }

  const sortTree = (folder: TreeFolder) => {
    folder.folders.sort((a, b) => a.name.localeCompare(b.name))
    folder.files.sort((a, b) => a.name.localeCompare(b.name))
    folder.folders.forEach(sortTree)
  }
  sortTree(root)
  return root
}

interface FileExplorerProps {
  roomName?: string
  mobileOpen?: boolean
  onFileSelect?: () => void
}

export function FileExplorer({
  roomName = 'project',
  mobileOpen = false,
  onFileSelect,
}: FileExplorerProps) {
  const {
    files: rawFiles,
    activeFileId,
    setActiveFile,
    addFile,
    renameFile,
    removeFile,
    language,
    explorerCollapsed,
    setExplorerCollapsed,
  } = useEditorStore()
  const files = Array.from(new Map(rawFiles.map((f) => [f.id, f])).values())
  const tree = buildTree(files)
  const [showInput, setShowInput] = useState(false)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())

  function toggleFolder(path: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }
  const [contextMenu, setContextMenu] = useState<
    | { kind: 'file'; fileId: string; x: number; y: number }
    | { kind: 'folder'; path: string; x: number; y: number }
    | null
  >(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  function startRename(fileId: string, currentName: string) {
    setContextMenu(null)
    setRenamingId(fileId)
    setRenameValue(currentName)
  }

  function commitRename() {
    if (renamingId && renameValue.trim()) {
      renameSharedFile(renamingId, renameValue.trim())
      renameFile(renamingId, renameValue.trim())
    }
    setRenamingId(null)
    setRenameValue('')
  }

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    const ext = name.includes('.') ? name.split('.').pop()! : 'js'
    const file = {
      id: crypto.randomUUID(),
      name,
      content: '',
      language: extToLang(ext) || language,
    }
    addSharedFile(file)
    addFile(file)
    setActiveFile(file.id)
    setNewName('')
    setShowInput(false)
  }

  function handleDelete(fileId: string) {
    setContextMenu(null)
    if (files.length <= 1) return
    removeSharedFile(fileId)
    removeFile(fileId)
  }

  function nextCopyName(name: string): string {
    const slash = name.lastIndexOf('/')
    const dir = slash === -1 ? '' : name.slice(0, slash + 1)
    const base = slash === -1 ? name : name.slice(slash + 1)
    const dot = base.lastIndexOf('.')
    const stem = dot === -1 ? base : base.slice(0, dot)
    const ext = dot === -1 ? '' : base.slice(dot)
    const taken = new Set(files.map((f) => f.name))
    for (let n = 1; ; n++) {
      const candidate = `${dir}${stem} copy${n === 1 ? '' : ` ${n}`}${ext}`
      if (!taken.has(candidate)) return candidate
    }
  }

  function handleDuplicate(fileId: string) {
    setContextMenu(null)
    const file = files.find((f) => f.id === fileId)
    if (!file) return
    const content =
      getAllFilesContent().find((f) => f.name === file.name)?.content ?? ''
    importFilesToWorkspace([{ name: nextCopyName(file.name), content }])
  }

  function handleCopyPath(path: string) {
    setContextMenu(null)
    void navigator.clipboard
      .writeText(path)
      .then(() => toast.success('Path copied'))
  }

  function handleDownload(fileId: string) {
    setContextMenu(null)
    const file = files.find((f) => f.id === fileId)
    if (!file) return
    const content =
      getAllFilesContent().find((f) => f.name === file.name)?.content ?? ''
    const url = URL.createObjectURL(new Blob([content], { type: 'text/plain' }))
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = baseName(file.name)
    anchor.click()
    URL.revokeObjectURL(url)
  }

  function handleNewFileIn(path: string) {
    setContextMenu(null)
    setNewName(`${path}/`)
    setShowInput(true)
  }

  function handleDeleteFolder(path: string) {
    setContextMenu(null)
    const children = files.filter((f) => f.name.startsWith(`${path}/`))
    if (children.length === 0 || children.length >= files.length) return
    for (const child of children) {
      removeSharedFile(child.id)
      removeFile(child.id)
    }
  }

  function renderFile(file: EditorFile, depth: number) {
    return (
      <div
        key={file.id}
        onContextMenu={(e) => {
          e.preventDefault()
          setContextMenu({
            kind: 'file',
            fileId: file.id,
            x: e.clientX,
            y: e.clientY,
          })
        }}
        style={{ paddingLeft: 8 + depth * 12 }}
        className={`group flex w-full items-center gap-1.5 rounded-sm py-[5px] pr-2 text-xs transition-colors ${
          activeFileId === file.id
            ? 'bg-app-card-hover text-app shadow-[inset_2px_0_0_var(--coder-accent)]'
            : 'text-app-muted hover-app-card hover:text-app'
        }`}
      >
        <button
          onClick={() => {
            setActiveFile(file.id)
            onFileSelect?.()
          }}
          onDoubleClick={() => startRename(file.id, file.name)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-1.5"
        >
          <FileCode className="h-3.5 w-3.5 shrink-0 opacity-70" />
          {renamingId === file.id ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename()
                if (e.key === 'Escape') {
                  setRenamingId(null)
                  setRenameValue('')
                }
              }}
              onBlur={commitRename}
              onClick={(e) => e.stopPropagation()}
              className="bg-app text-app w-full rounded border border-[var(--coder-accent)]/40 px-1 py-0 text-xs outline-none"
            />
          ) : (
            <span className="truncate" title={file.name}>
              {baseName(file.name)}
            </span>
          )}
        </button>
      </div>
    )
  }

  function renderFolderContents(
    folder: TreeFolder,
    depth: number
  ): React.ReactNode[] {
    const nodes: React.ReactNode[] = []
    for (const sub of folder.folders) {
      const isCollapsed = collapsed.has(sub.path)
      nodes.push(
        <button
          key={`dir:${sub.path}`}
          onClick={() => toggleFolder(sub.path)}
          onContextMenu={(e) => {
            e.preventDefault()
            setContextMenu({
              kind: 'folder',
              path: sub.path,
              x: e.clientX,
              y: e.clientY,
            })
          }}
          style={{ paddingLeft: 8 + depth * 12 }}
          className="text-app-muted hover-app-card hover:text-app flex w-full items-center gap-1 rounded-sm py-[5px] pr-2 text-xs transition-colors"
          title={sub.path}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3 shrink-0 opacity-60" />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
          )}
          {isCollapsed ? (
            <Folder className="h-3.5 w-3.5 shrink-0 opacity-70" />
          ) : (
            <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-70" />
          )}
          <span className="truncate">{sub.name}</span>
        </button>
      )
      if (!isCollapsed) nodes.push(...renderFolderContents(sub, depth + 1))
    }
    for (const file of folder.files) {
      nodes.push(renderFile(file, depth))
    }
    return nodes
  }

  return (
    <>
      {/* Collapsed rail — desktop only */}
      {explorerCollapsed && (
        <div className="border-app bg-app-surface hidden w-10 shrink-0 flex-col items-center gap-1 border-r py-2 md:flex">
          <button
            onClick={() => setExplorerCollapsed(false)}
            title="Show explorer"
            className="text-app-dim hover:text-app-muted flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
          >
            <PanelLeftOpen className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setExplorerCollapsed(false)
              setShowInput(true)
            }}
            title="New file"
            className="text-app-dim hover:text-app-muted flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}

      <div
        className={`border-app bg-app-surface flex-col overflow-hidden border-r max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:w-[82%] max-md:max-w-[300px] max-md:shadow-[4px_0_24px_rgba(0,0,0,0.5)] md:w-[220px] md:shrink-0 ${
          explorerCollapsed ? 'md:hidden' : 'md:flex'
        } ${mobileOpen ? 'max-md:flex' : 'max-md:hidden'}`}
      >
        {/* Header */}
        <div className="border-app flex h-9 shrink-0 items-center justify-between border-b pr-1.5 pl-3">
          <span
            className="text-app-dim truncate text-[10px] font-semibold tracking-widest uppercase"
            title={roomName}
          >
            {roomName}
          </span>
          <div className="flex items-center">
            <button
              onClick={() => setShowInput(true)}
              title="New file"
              className="text-app-dim hover:text-app-muted flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setExplorerCollapsed(true)}
              title="Hide explorer"
              className="text-app-dim hover:text-app-muted flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)] max-md:hidden"
            >
              <PanelLeftClose className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* File tree */}
        <div className="flex-1 overflow-y-auto px-1 pt-1 pb-1">
          {renderFolderContents(tree, 0)}

          {/* Context menu */}
          {contextMenu && (
            <div
              ref={contextMenuRef}
              style={{
                position: 'fixed',
                top: contextMenu.y,
                left: contextMenu.x,
                zIndex: 200,
              }}
              className="border-app-mid bg-app-surface min-w-[170px] rounded-md border py-1 shadow-[var(--coder-shadow-md)]"
            >
              {contextMenu.kind === 'file' ? (
                <>
                  <button
                    onClick={() => {
                      const file = files.find(
                        (f) => f.id === contextMenu.fileId
                      )
                      if (file) startRename(file.id, file.name)
                    }}
                    className="text-app hover-app-card flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                  >
                    <Pencil className="h-3 w-3 opacity-60" />
                    Rename
                  </button>
                  <button
                    onClick={() => handleDuplicate(contextMenu.fileId)}
                    className="text-app hover-app-card flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                  >
                    <CopyPlus className="h-3 w-3 opacity-60" />
                    Duplicate
                  </button>
                  <button
                    onClick={() => {
                      const file = files.find(
                        (f) => f.id === contextMenu.fileId
                      )
                      if (file) handleCopyPath(file.name)
                    }}
                    className="text-app hover-app-card flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                  >
                    <Copy className="h-3 w-3 opacity-60" />
                    Copy path
                  </button>
                  <button
                    onClick={() => handleDownload(contextMenu.fileId)}
                    className="text-app hover-app-card flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                  >
                    <Download className="h-3 w-3 opacity-60" />
                    Download
                  </button>
                  {files.length > 1 && (
                    <>
                      <div className="border-app my-1 border-t" />
                      <button
                        onClick={() => handleDelete(contextMenu.fileId)}
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-400/10"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <button
                    onClick={() => handleNewFileIn(contextMenu.path)}
                    className="text-app hover-app-card flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                  >
                    <FilePlus className="h-3 w-3 opacity-60" />
                    New file
                  </button>
                  <button
                    onClick={() => handleCopyPath(contextMenu.path)}
                    className="text-app hover-app-card flex w-full items-center gap-2 px-3 py-1.5 text-xs"
                  >
                    <Copy className="h-3 w-3 opacity-60" />
                    Copy path
                  </button>
                  <div className="border-app my-1 border-t" />
                  <button
                    onClick={() => handleDeleteFolder(contextMenu.path)}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-400/10"
                  >
                    <Trash2 className="h-3 w-3" />
                    Delete folder
                  </button>
                </>
              )}
            </div>
          )}

          {showInput && (
            <div className="px-2 py-1">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAdd()
                  if (e.key === 'Escape') {
                    setNewName('')
                    setShowInput(false)
                  }
                }}
                onBlur={() => {
                  if (!newName.trim()) setShowInput(false)
                }}
                placeholder="src/file.ts"
                className="bg-app text-app placeholder:text-app-dim w-full rounded border border-[var(--coder-accent)]/40 px-2 py-0.5 text-xs outline-none focus:border-[var(--coder-accent)]/70"
              />
            </div>
          )}
        </div>

        {/* Add file footer */}
        <div className="border-app border-t px-2 py-1.5">
          <button
            onClick={() => setShowInput(true)}
            className="text-app-dim hover:text-app-muted hover-app-card flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[11px] transition-colors"
          >
            <Plus className="h-3 w-3" />
            Add file
          </button>
        </div>
      </div>
    </>
  )
}
