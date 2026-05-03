'use client'

import { useEditorStore } from '@/stores/editor-store'
import { Settings, Save, Check, ChevronDown } from 'lucide-react'
import { EditorSettings } from './editor-settings'
import { LanguageIcon } from './language-icon'
import { useState, useRef, useEffect } from 'react'

const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'c', label: 'C' },
  { value: 'csharp', label: 'C#' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'php', label: 'PHP' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'scala', label: 'Scala' },
  { value: 'r', label: 'R' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'lua', label: 'Lua' },
  { value: 'perl', label: 'Perl' },
  { value: 'haskell', label: 'Haskell' },
  { value: 'elixir', label: 'Elixir' },
  { value: 'clojure', label: 'Clojure' },
  { value: 'dart', label: 'Dart' },
  { value: 'julia', label: 'Julia' },
  { value: 'matlab', label: 'MATLAB' },
  { value: 'vbnet', label: 'VB.NET' },
  { value: 'cobol', label: 'COBOL' },
  { value: 'fortran', label: 'Fortran' },
  { value: 'assembly', label: 'Assembly' },
]

export function EditorToolbar() {
  const { language, setLanguage, isSaving, lastSaved, theme, setTheme } =
    useEditorStore()
  const [showSettings, setShowSettings] = useState(false)
  const [showLang, setShowLang] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setShowLang(false)
      }
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  const currentLang = LANGUAGES.find((l) => l.value === language)

  return (
    <div className="relative flex h-10 shrink-0 items-center justify-between gap-2 border-b border-white/[0.06] bg-[#0D0D0D] px-3">
      <div className="flex items-center gap-2">
        {/* Language pill */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setShowLang((v) => !v)}
            className="flex h-7 items-center gap-1.5 rounded-md border border-white/[0.10] bg-[#1A0A0D] px-2.5 text-xs text-[#F0F0F0] transition-colors hover:border-white/20 hover:bg-[#2D1018]"
          >
            <LanguageIcon language={language} size={14} />
            <span className="font-medium">
              {currentLang?.label ?? language}
            </span>
            <ChevronDown
              className={`h-3 w-3 text-[#555555] transition-transform ${showLang ? 'rotate-180' : ''}`}
            />
          </button>

          {showLang && (
            <div className="absolute top-8 left-0 z-50 max-h-56 w-44 overflow-y-auto rounded-md border border-white/[0.10] bg-[#0D0D0D] py-1 shadow-[0_4px_16px_rgba(0,0,0,0.6)]">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => {
                    setLanguage(lang.value)
                    setShowLang(false)
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                    lang.value === language
                      ? 'bg-[#2D1018] text-[#FF2D55]'
                      : 'text-[#888888] hover:bg-[#1A0A0D] hover:text-[#F0F0F0]'
                  }`}
                >
                  <LanguageIcon language={lang.value} size={14} />
                  {lang.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Theme selector */}
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as 'vs-dark' | 'light')}
          className="h-7 rounded-md border border-white/[0.10] bg-[#1A0A0D] px-2 text-xs text-[#F0F0F0] transition-colors outline-none hover:border-white/20 hover:bg-[#2D1018]"
        >
          <option value="vs-dark">VS Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {isSaving ? (
          <div className="flex items-center gap-1 text-xs text-[#555555]">
            <Save className="h-3 w-3 animate-pulse" />
            <span>Saving…</span>
          </div>
        ) : lastSaved ? (
          <div className="flex items-center gap-1 text-xs text-[#555555]">
            <Check className="h-3 w-3 text-[#32D74B]" />
            <span>Saved</span>
          </div>
        ) : null}

        <button
          onClick={() => setShowSettings((v) => !v)}
          title="Editor settings"
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            showSettings
              ? 'bg-white/10 text-[#F0F0F0]'
              : 'text-[#555555] hover:bg-white/5 hover:text-[#888888]'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      <EditorSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  )
}
