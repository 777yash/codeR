'use client'

import { useEditorStore } from '@/stores/editor-store'
import { Settings, Save, Check, Code2 } from 'lucide-react'
import { EditorSettings } from './editor-settings'
import { LanguageStatsBar } from './language-stats-bar'
import { useCallback, useState } from 'react'

export function EditorToolbar({ readOnly = true }: { readOnly?: boolean }) {
  const { isSaving, lastSaved, theme, setTheme } = useEditorStore()
  const [showSettings, setShowSettings] = useState(false)
  const closeSettings = useCallback(() => setShowSettings(false), [])

  return (
    <div className="editor-chrome border-app bg-app-surface relative flex h-10 shrink-0 items-center justify-between gap-2 border-b px-3">
      <div className="flex min-w-0 items-center gap-2">
        <span className="editor-toolbar-title text-app-muted flex items-center gap-2 text-xs">
          <Code2 className="h-3.5 w-3.5" />
          Workspace
        </span>
        {readOnly && (
          <span className="text-app-dim shrink-0 text-xs">Read only</span>
        )}
        {/* Language breakdown — auto-detected per file, GitHub-style */}
        <LanguageStatsBar />

        {/* Editor theme — segmented toggle */}
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <div
          className="editor-theme-control border-app-mid bg-app-card flex h-7 shrink-0 items-center rounded-md border p-0.5"
          role="group"
          aria-label="Editor theme"
        >
          {(['vs-dark', 'light'] as const).map((value) => (
            <button
              key={value}
              aria-pressed={theme === value}
              onClick={() => setTheme(value)}
              className={`h-full rounded-[5px] px-2 text-[11px] transition-colors ${
                theme === value
                  ? 'bg-app-card-active text-app font-medium'
                  : 'text-app-dim hover:text-app-muted'
              }`}
            >
              {value === 'vs-dark' ? 'Dark' : 'Light'}
            </button>
          ))}
        </div>
        {isSaving ? (
          <div className="text-app-dim flex items-center gap-1 text-xs">
            <Save className="h-3 w-3 animate-pulse" />
            <span className="hidden sm:inline">Saving…</span>
          </div>
        ) : lastSaved ? (
          <div className="text-app-dim flex items-center gap-1 text-xs">
            <Check className="text-app-muted h-3 w-3" />
            <span className="hidden sm:inline">Saved</span>
          </div>
        ) : null}

        <button
          onClick={() => setShowSettings((v) => !v)}
          title="Editor settings"
          aria-label="Editor settings"
          aria-expanded={showSettings}
          data-editor-settings-trigger
          className={`flex h-7 w-7 items-center justify-center rounded transition-colors ${
            showSettings
              ? 'text-app bg-[var(--coder-bg-card-active)]'
              : 'text-app-dim hover:text-app-muted hover:bg-[var(--coder-bg-card-hover)]'
          }`}
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      <EditorSettings open={showSettings} onClose={closeSettings} />
    </div>
  )
}
