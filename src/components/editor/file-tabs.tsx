'use client'

import { useEditorStore, type EditorFile } from '@/stores/editor-store'
import {
  addSharedFile,
  removeSharedFile,
} from '@/components/editor/editor-client'
import { X, Plus, FileCode } from 'lucide-react'
import { useState } from 'react'

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
  bash: 'bash',
  lua: 'lua',
  pl: 'perl',
  hs: 'haskell',
  ex: 'elixir',
  exs: 'elixir',
  clj: 'clojure',
  dart: 'dart',
  jl: 'julia',
  m: 'matlab',
  vb: 'vbnet',
  cob: 'cobol',
  f90: 'fortran',
  asm: 'assembly',
}

function extToLang(ext: string | undefined, fallback: string): string {
  return EXT_TO_LANG[ext ?? ''] ?? fallback
}

export function FileTabs() {
  const {
    files: rawFiles,
    activeFileId,
    openFileIds,
    setActiveFile,
    closeFile,
    closeOtherFiles,
    addFile,
    removeFile,
    language,
  } = useEditorStore()
  const files = Array.from(new Map(rawFiles.map((f) => [f.id, f])).values())
  const openFiles = openFileIds
    .map((id) => files.find((f) => f.id === id))
    .filter((f): f is EditorFile => f !== undefined)
  const [showInput, setShowInput] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [tabMenu, setTabMenu] = useState<{
    fileId: string
    x: number
    y: number
  } | null>(null)

  function handleAdd() {
    const name = newFileName.trim()
    if (!name) return
    const ext = name.includes('.') ? name.split('.').pop() : undefined
    const file: EditorFile = {
      id: crypto.randomUUID(),
      name,
      content: '',
      language: extToLang(ext, language),
    }
    addSharedFile(file)
    addFile(file)
    setActiveFile(file.id)
    setNewFileName('')
    setShowInput(false)
  }

  function handleDeleteFile(fileId: string) {
    setTabMenu(null)
    removeSharedFile(fileId)
    removeFile(fileId)
  }

  return (
    <div className="border-app bg-app-surface flex h-9 shrink-0 items-stretch border-b">
      {/* Tabs — open files only; closing a tab keeps the file in the workspace */}
      <div className="flex flex-1 items-stretch overflow-x-auto">
        {openFiles.map((file) => {
          const isActive = activeFileId === file.id
          return (
            <div
              key={file.id}
              onClick={() => setActiveFile(file.id)}
              onAuxClick={(e) => {
                if (e.button === 1) {
                  e.preventDefault()
                  closeFile(file.id)
                }
              }}
              onContextMenu={(e) => {
                e.preventDefault()
                setTabMenu({ fileId: file.id, x: e.clientX, y: e.clientY })
              }}
              className={`group border-app relative flex max-w-[180px] min-w-[100px] cursor-pointer items-center gap-1.5 border-r px-3 text-xs transition-colors ${
                isActive
                  ? 'bg-app text-app'
                  : 'bg-app-surface text-app-dim hover-app-card hover:text-app-muted'
              }`}
            >
              {/* Active indicator: top border */}
              {isActive && (
                <div className="absolute inset-x-0 top-0 h-[2px] bg-[var(--coder-accent)]" />
              )}
              <FileCode className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate" title={file.name}>
                {file.name.slice(file.name.lastIndexOf('/') + 1)}
              </span>
              {openFiles.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    closeFile(file.id)
                  }}
                  className="hover:text-app ml-auto shrink-0 rounded p-px opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Tab context menu */}
      {tabMenu && (
        <>
          <div
            className="fixed inset-0 z-[199]"
            onClick={() => setTabMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault()
              setTabMenu(null)
            }}
          />
          <div
            style={{
              position: 'fixed',
              top: tabMenu.y,
              left: tabMenu.x,
              zIndex: 200,
            }}
            className="border-app-mid bg-app-surface min-w-[150px] rounded-md border py-1 shadow-[var(--coder-shadow-md)]"
          >
            <button
              onClick={() => {
                setTabMenu(null)
                closeFile(tabMenu.fileId)
              }}
              disabled={openFiles.length <= 1}
              className="text-app hover-app-card flex w-full items-center px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Close
            </button>
            <button
              onClick={() => {
                setTabMenu(null)
                closeOtherFiles(tabMenu.fileId)
              }}
              disabled={openFiles.length <= 1}
              className="text-app hover-app-card flex w-full items-center px-3 py-1.5 text-xs disabled:opacity-40"
            >
              Close others
            </button>
            {files.length > 1 && (
              <>
                <div className="border-app my-1 border-t" />
                <button
                  onClick={() => handleDeleteFile(tabMenu.fileId)}
                  className="flex w-full items-center px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-400/10"
                >
                  Delete file
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* New file */}
      {showInput ? (
        <div className="flex items-center gap-1 px-2">
          <input
            autoFocus
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
              if (e.key === 'Escape') {
                setNewFileName('')
                setShowInput(false)
              }
            }}
            onBlur={() => {
              if (!newFileName.trim()) setShowInput(false)
            }}
            placeholder="filename.js"
            className="border-app-mid bg-app text-app placeholder:text-app-dim h-6 w-28 rounded border px-2 text-xs outline-none focus:border-[var(--coder-accent)]/50"
          />
          <button
            onClick={handleAdd}
            className="text-app-muted hover:text-app h-6 rounded px-1.5 text-xs hover:bg-[var(--coder-bg-card-active)]"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          title="New file"
          className="text-app-dim hover:text-app-muted flex h-full w-9 items-center justify-center transition-colors hover:bg-[var(--coder-bg-card-hover)]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
