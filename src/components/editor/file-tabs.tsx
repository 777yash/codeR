'use client'

import { useEditorStore, type EditorFile } from '@/stores/editor-store'
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
  const { files, activeFileId, setActiveFile, removeFile, addFile, language } =
    useEditorStore()
  const [showInput, setShowInput] = useState(false)
  const [newFileName, setNewFileName] = useState('')

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
    addFile(file)
    setActiveFile(file.id)
    setNewFileName('')
    setShowInput(false)
  }

  return (
    <div className="flex h-9 shrink-0 items-stretch border-b border-white/[0.06] bg-[#0D0D0D]">
      {/* Tabs */}
      <div className="flex flex-1 items-stretch overflow-x-auto">
        {files.map((file) => {
          const isActive = activeFileId === file.id
          return (
            <div
              key={file.id}
              onClick={() => setActiveFile(file.id)}
              className={`group relative flex max-w-[180px] min-w-[100px] cursor-pointer items-center gap-1.5 border-r border-white/[0.06] px-3 text-xs transition-colors ${
                isActive
                  ? 'bg-black text-[#F0F0F0]'
                  : 'bg-[#0D0D0D] text-[#555555] hover:bg-[#111] hover:text-[#888888]'
              }`}
            >
              {/* Active indicator: top border */}
              {isActive && (
                <div className="absolute inset-x-0 top-0 h-[2px] bg-[#FF2D55]" />
              )}
              <FileCode className="h-3 w-3 shrink-0 opacity-70" />
              <span className="truncate">{file.name}</span>
              {files.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(file.id)
                  }}
                  className="ml-auto shrink-0 rounded p-px opacity-0 transition-opacity group-hover:opacity-100 hover:text-[#F0F0F0]"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          )
        })}
      </div>

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
            className="h-6 w-28 rounded border border-white/20 bg-black/70 px-2 text-xs text-white outline-none placeholder:text-[#555555] focus:border-[#FF2D55]/50"
          />
          <button
            onClick={handleAdd}
            className="h-6 rounded px-1.5 text-xs text-[#888888] hover:bg-white/10 hover:text-white"
          >
            Add
          </button>
        </div>
      ) : (
        <button
          onClick={() => setShowInput(true)}
          title="New file"
          className="flex h-full w-9 items-center justify-center text-[#555555] transition-colors hover:bg-white/5 hover:text-[#888888]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  )
}
