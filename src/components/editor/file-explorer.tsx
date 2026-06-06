'use client'

import { useEditorStore } from '@/stores/editor-store'
import {
  addSharedFile,
  removeSharedFile,
  renameSharedFile,
} from '@/components/editor/editor-client'
import { FileCode, Plus, FolderOpen, Trash2 } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

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
  } = useEditorStore()
  const files = Array.from(new Map(rawFiles.map((f) => [f.id, f])).values())
  const [showInput, setShowInput] = useState(false)
  const [newName, setNewName] = useState('')
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    fileId: string
    x: number
    y: number
  } | null>(null)
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

  return (
    <div
      className={`border-app bg-app-surface flex-col overflow-hidden border-r max-md:absolute max-md:inset-y-0 max-md:left-0 max-md:z-30 max-md:w-[82%] max-md:max-w-[300px] max-md:shadow-[4px_0_24px_rgba(0,0,0,0.5)] md:flex md:w-[220px] md:shrink-0 ${
        mobileOpen ? 'max-md:flex' : 'max-md:hidden'
      }`}
    >
      {/* Header */}
      <div className="flex h-9 items-center justify-between px-3">
        <span className="text-app-dim text-[10px] font-semibold tracking-widest uppercase">
          {roomName}
        </span>
        <button
          onClick={() => setShowInput(true)}
          title="New file"
          className="text-app-dim hover:text-app-muted rounded p-0.5 transition-colors hover:bg-white/5"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto px-1 pb-1">
        <div className="flex items-center gap-1.5 px-2 py-0.5">
          <FolderOpen className="text-app-dim h-3.5 w-3.5 shrink-0" />
          <span className="text-app-dim text-[11px]">{roomName}/</span>
        </div>

        {files.map((file) => (
          <div
            key={file.id}
            onContextMenu={(e) => {
              e.preventDefault()
              setContextMenu({ fileId: file.id, x: e.clientX, y: e.clientY })
            }}
            className={`group flex w-full items-center gap-1.5 rounded-sm py-[5px] text-xs transition-colors ${
              activeFileId === file.id
                ? 'bg-app-card-hover text-app border-l-2 border-[#FF2D55] pr-2 pl-[6px]'
                : 'text-app-muted hover-app-card hover:text-app pr-2 pl-2'
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
                  className="bg-app text-app w-full rounded border border-[#FF2D55]/40 px-1 py-0 text-xs outline-none"
                />
              ) : (
                <span className="truncate">{file.name}</span>
              )}
            </button>
          </div>
        ))}

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
            className="border-app-mid bg-app-surface min-w-[140px] rounded-md border py-1 shadow-[0_4px_16px_rgba(0,0,0,0.4)]"
          >
            <button
              onClick={() => {
                const file = files.find((f) => f.id === contextMenu.fileId)
                if (file) startRename(file.id, file.name)
              }}
              className="text-app hover-app-card flex w-full items-center px-3 py-1.5 text-xs"
            >
              Rename
            </button>
            {files.length > 1 && (
              <button
                onClick={() => handleDelete(contextMenu.fileId)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-400/10"
              >
                <Trash2 className="h-3 w-3" />
                Delete
              </button>
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
              placeholder="filename.js"
              className="bg-app text-app placeholder:text-app-dim w-full rounded border border-[#FF2D55]/40 px-2 py-0.5 text-xs outline-none focus:border-[#FF2D55]/70"
            />
          </div>
        )}
      </div>

      {/* Add file footer */}
      <div className="border-app border-t px-2 py-1.5">
        <button
          onClick={() => setShowInput(true)}
          className="text-app-dim hover:text-app-muted flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[11px] transition-colors"
        >
          <Plus className="h-3 w-3" />
          Add file
        </button>
      </div>
    </div>
  )
}
