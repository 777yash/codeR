'use client'

import { useEditorStore } from '@/stores/editor-store'

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

export function StatusBar() {
  const { language, files, activeFileId } = useEditorStore()
  const activeFile = files.find((f) => f.id === activeFileId)
  const displayLang = LANG_DISPLAY[activeFile?.language ?? language] ?? language

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
      <div className="text-app-dim flex items-center gap-1.5 text-[11px]">
        <div className="h-1.5 w-1.5 rounded-full bg-[#32D74B]" />
        <span>Connected</span>
      </div>
    </div>
  )
}
