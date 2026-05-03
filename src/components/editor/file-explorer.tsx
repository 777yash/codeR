'use client'

import { useEditorStore } from '@/stores/editor-store'
import { FileCode, Plus, FolderOpen } from 'lucide-react'
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
}

export function FileExplorer({ roomName = 'project' }: FileExplorerProps) {
  const { files, activeFileId, setActiveFile, addFile, language } =
    useEditorStore()
  const [showInput, setShowInput] = useState(false)
  const [newName, setNewName] = useState('')

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    const ext = name.includes('.') ? name.split('.').pop()! : 'js'
    addFile({
      id: crypto.randomUUID(),
      name,
      content: '',
      language: extToLang(ext) || language,
    })
    setNewName('')
    setShowInput(false)
  }

  return (
    <div className="flex w-[220px] shrink-0 flex-col overflow-hidden border-r border-white/[0.06] bg-[#0D0D0D]">
      {/* Header */}
      <div className="flex h-9 items-center justify-between px-3">
        <span className="text-[10px] font-semibold tracking-widest text-[#555555] uppercase">
          {roomName}
        </span>
        <button
          onClick={() => setShowInput(true)}
          title="New file"
          className="rounded p-0.5 text-[#555555] transition-colors hover:bg-white/5 hover:text-[#888888]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* File tree */}
      <div className="flex-1 overflow-y-auto px-1 pb-1">
        <div className="flex items-center gap-1.5 px-2 py-0.5">
          <FolderOpen className="h-3.5 w-3.5 shrink-0 text-[#555555]" />
          <span className="text-[11px] text-[#555555]">{roomName}/</span>
        </div>

        {files.map((file) => (
          <button
            key={file.id}
            onClick={() => setActiveFile(file.id)}
            className={`group flex w-full items-center gap-1.5 rounded-sm py-[5px] text-xs transition-colors ${
              activeFileId === file.id
                ? 'border-l-2 border-[#FF2D55] bg-[#2D1018] pr-2 pl-[6px] text-[#F0F0F0]'
                : 'pr-2 pl-2 text-[#888888] hover:bg-[#1A0A0D] hover:text-[#F0F0F0]'
            }`}
          >
            <FileCode className="h-3.5 w-3.5 shrink-0 opacity-70" />
            <span className="truncate">{file.name}</span>
          </button>
        ))}

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
              className="w-full rounded border border-[#FF2D55]/40 bg-black px-2 py-0.5 text-xs text-white outline-none placeholder:text-[#555555] focus:border-[#FF2D55]/70"
            />
          </div>
        )}
      </div>

      {/* Add file footer */}
      <div className="border-t border-white/[0.06] px-2 py-1.5">
        <button
          onClick={() => setShowInput(true)}
          className="flex w-full items-center gap-1.5 rounded px-1.5 py-1 text-[11px] text-[#555555] transition-colors hover:text-[#888888]"
        >
          <Plus className="h-3 w-3" />
          Add file
        </button>
      </div>
    </div>
  )
}
