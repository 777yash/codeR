'use client'

import { useEditorStore } from '@/stores/editor-store'
import { Settings, Save, Check } from 'lucide-react'
import { EditorSettings } from './editor-settings'
import { LanguageStatsBar } from './language-stats-bar'
import { useState } from 'react'

export function EditorToolbar() {
  const { isSaving, lastSaved, theme, setTheme } = useEditorStore()
  const [showSettings, setShowSettings] = useState(false)

  return (
    <div className="border-app bg-app-surface relative flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3">
      <div className="flex items-center gap-2">
        {/* Language breakdown — auto-detected per file, GitHub-style */}
        <LanguageStatsBar />

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
              ? 'text-app bg-[var(--coder-bg-card-active)]'
              : 'text-app-dim hover:text-app-muted hover:bg-[var(--coder-bg-card-hover)]'
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
