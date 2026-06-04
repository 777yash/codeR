'use client'

import { useEditorStore } from '@/stores/editor-store'
import { Settings, Save, Check, ChevronDown } from 'lucide-react'
import { EditorSettings } from './editor-settings'
import { LanguageIcon } from './language-icon'
import { useState, useRef, useEffect } from 'react'
import { LANGUAGES } from '@/lib/editor-options'

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
    <div className="border-app bg-app-surface relative flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3">
      <div className="flex items-center gap-2">
        {/* Language pill */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setShowLang((v) => !v)}
            className="border-app-mid bg-app-card text-app hover:border-app-mid hover:bg-app-card-hover flex h-7 items-center gap-1.5 rounded-md border px-2.5 text-xs transition-colors"
          >
            <LanguageIcon language={language} size={14} />
            <span className="font-medium">
              {currentLang?.label ?? language}
            </span>
            <ChevronDown
              className={`text-app-dim h-3 w-3 transition-transform ${showLang ? 'rotate-180' : ''}`}
            />
          </button>

          {showLang && (
            <div className="border-app-mid bg-app-surface absolute top-8 left-0 z-50 max-h-56 w-44 overflow-y-auto rounded-md border py-1 shadow-[0_4px_16px_rgba(0,0,0,0.4)]">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  onClick={() => {
                    setLanguage(lang.value)
                    setShowLang(false)
                  }}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-xs transition-colors ${
                    lang.value === language
                      ? 'bg-app-card-hover text-[#FF2D55]'
                      : 'text-app-muted hover-app-card hover:text-app'
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
          className="border-app-mid bg-app-card text-app hover:bg-app-card-hover h-7 rounded-md border px-2 text-xs transition-colors outline-none"
        >
          <option value="vs-dark">VS Dark</option>
          <option value="light">Light</option>
        </select>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        {isSaving ? (
          <div className="text-app-dim flex items-center gap-1 text-xs">
            <Save className="h-3 w-3 animate-pulse" />
            <span>Saving…</span>
          </div>
        ) : lastSaved ? (
          <div className="text-app-dim flex items-center gap-1 text-xs">
            <Check className="h-3 w-3 text-[#32D74B]" />
            <span>Saved</span>
          </div>
        ) : null}

        <button
          onClick={() => setShowSettings((v) => !v)}
          title="Editor settings"
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            showSettings
              ? 'text-app bg-white/10'
              : 'text-app-dim hover:text-app-muted hover:bg-white/5'
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
