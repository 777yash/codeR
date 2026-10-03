'use client'

import { useEditorStore } from '@/stores/editor-store'
import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'

export function EditorSettings({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const {
    lineNumbers,
    setLineNumbers,
    minimap,
    setMinimap,
    wordWrap,
    setWordWrap,
    fontSize,
    setFontSize,
    inlineSuggest,
    setInlineSuggest,
  } = useEditorStore()
  const panelRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    closeRef.current?.focus()
    let restoreFocus = true
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      }
    }
    const outside = (event: PointerEvent) => {
      const target = event.target
      if (
        target instanceof Element &&
        !panelRef.current?.contains(target) &&
        !target.closest('[data-editor-settings-trigger]')
      ) {
        restoreFocus = false
        onClose()
      }
    }
    document.addEventListener('keydown', escape)
    document.addEventListener('pointerdown', outside)
    return () => {
      document.removeEventListener('keydown', escape)
      document.removeEventListener('pointerdown', outside)
      if (restoreFocus && previous?.isConnected) previous.focus()
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Editor preferences"
      className="editor-preferences border-app-mid bg-app-surface absolute top-10 right-2 z-50 w-64 rounded-md border p-3"
    >
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-app text-sm font-medium">Editor Settings</h3>
        <button
          ref={closeRef}
          aria-label="Close editor preferences"
          onClick={onClose}
          className="text-app-muted hover:text-app text-xs"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-app-muted text-xs">Line Numbers</span>
          <select
            aria-label="Line numbers"
            value={lineNumbers}
            onChange={(e) =>
              setLineNumbers(e.target.value as 'on' | 'off' | 'relative')
            }
            className="border-app-mid bg-app text-app h-6 rounded border px-2 text-xs"
          >
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="relative">Relative</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-app-muted text-xs">Minimap</span>
          <button
            role="switch"
            aria-label="Minimap"
            aria-checked={minimap}
            onClick={() => setMinimap(!minimap)}
            className={`h-5 w-9 rounded-full transition-colors ${
              minimap
                ? 'bg-[var(--coder-accent)]'
                : 'bg-[var(--coder-bg-card-active)]'
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white transition-transform ${
                minimap ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-app-muted text-xs">Word Wrap</span>
          <button
            role="switch"
            aria-label="Word wrap"
            aria-checked={wordWrap === 'on'}
            onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
            className={`h-5 w-9 rounded-full transition-colors ${
              wordWrap === 'on'
                ? 'bg-[var(--coder-accent)]'
                : 'bg-[var(--coder-bg-card-active)]'
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white transition-transform ${
                wordWrap === 'on' ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-app-muted text-xs">AI Suggestions</span>
          <button
            role="switch"
            aria-label="AI suggestions"
            aria-checked={inlineSuggest}
            onClick={() => setInlineSuggest(!inlineSuggest)}
            className={`h-5 w-9 rounded-full transition-colors ${
              inlineSuggest
                ? 'bg-[var(--coder-accent)]'
                : 'bg-[var(--coder-bg-card-active)]'
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white transition-transform ${
                inlineSuggest ? 'translate-x-4' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-app-muted text-xs">Font Size</span>
            <span className="text-app text-xs">{fontSize}px</span>
          </div>
          <input
            aria-label="Font size"
            type="range"
            min={10}
            max={24}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-[var(--coder-bg-card-active)]"
          />
        </div>
      </div>
    </div>
  )
}
