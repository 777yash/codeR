'use client'

import { useSyncExternalStore } from 'react'
import { Globe } from 'lucide-react'
import { useEditorStore } from '@/stores/editor-store'
import {
  subscribeWebContainerPreview,
  getWebContainerPreview,
  type WebContainerStatus,
} from '@/lib/webcontainer'

const RUNTIME_DISPLAY: Record<
  WebContainerStatus,
  { label: string; color: string }
> = {
  booting: { label: 'Runtime: booting…', color: '#FF9F0A' },
  ready: { label: 'Runtime: ready', color: '#32D74B' },
  error: { label: 'Runtime: error', color: '#FF453A' },
  unsupported: {
    label: 'Runtime: unavailable',
    color: 'var(--coder-text-tertiary)',
  },
}

const LANG_DISPLAY: Record<string, string> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  csharp: 'C#',
  go: 'Go',
  rust: 'Rust',
  ruby: 'Ruby',
  php: 'PHP',
  swift: 'Swift',
  kotlin: 'Kotlin',
  scala: 'Scala',
  r: 'R',
  sql: 'SQL',
  bash: 'Bash',
  lua: 'Lua',
  perl: 'Perl',
  haskell: 'Haskell',
  elixir: 'Elixir',
  clojure: 'Clojure',
  dart: 'Dart',
  julia: 'Julia',
  matlab: 'MATLAB',
}

export function StatusBar({
  webContainerStatus = null,
}: {
  webContainerStatus?: WebContainerStatus | null
}) {
  const {
    language,
    files,
    activeFileId,
    terminalOpen,
    setTerminalOpen,
    previewOpen,
    setPreviewOpen,
  } = useEditorStore()
  const preview = useSyncExternalStore(
    subscribeWebContainerPreview,
    getWebContainerPreview,
    () => null
  )
  const activeFile = files.find((f) => f.id === activeFileId)
  const displayLang = LANG_DISPLAY[activeFile?.language ?? language] ?? language
  const runtime = webContainerStatus
    ? RUNTIME_DISPLAY[webContainerStatus]
    : null

  const handlePreviewToggle = () => {
    if (!preview) return
    setPreviewOpen(!previewOpen)
  }

  return (
    <div className="border-app bg-app-surface flex h-6 shrink-0 items-center justify-between border-t px-3">
      <div className="text-app-dim flex items-center gap-3 text-[11px]">
        <span>{displayLang}</span>
        <span className="opacity-20">|</span>
        <span>UTF-8</span>
        <span className="opacity-20">|</span>
        <span>LF</span>
        <span className="opacity-20">|</span>
        <span>Spaces: 2</span>
      </div>
      <div className="text-app-dim flex items-center gap-3 text-[11px]">
        {runtime && (
          <button
            onClick={() =>
              webContainerStatus === 'ready' && setTerminalOpen(!terminalOpen)
            }
            disabled={webContainerStatus !== 'ready'}
            title={
              webContainerStatus === 'ready'
                ? 'Toggle terminal (Ctrl+`)'
                : undefined
            }
            className={`flex items-center gap-1.5 rounded px-1 transition-colors ${
              webContainerStatus === 'ready'
                ? 'cursor-pointer hover:bg-[var(--coder-bg-card-hover)] hover:text-[var(--coder-text-secondary)]'
                : 'cursor-default'
            }`}
          >
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: runtime.color }}
            />
            <span>{runtime.label}</span>
          </button>
        )}
        {preview && (
          <button
            onClick={handlePreviewToggle}
            title="Toggle live preview"
            className={`flex items-center gap-1.5 rounded px-1 transition-colors hover:bg-[var(--coder-bg-card-hover)] hover:text-[var(--coder-text-secondary)] ${
              previewOpen ? 'text-[var(--coder-text-secondary)]' : ''
            }`}
          >
            <Globe className="h-3 w-3" />
            <span>Preview :{preview.port}</span>
          </button>
        )}
        <div className="flex items-center gap-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-[#32D74B]" />
          <span>Connected</span>
        </div>
      </div>
    </div>
  )
}
