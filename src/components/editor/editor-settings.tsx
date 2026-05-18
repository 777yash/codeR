'use client'

import { useEditorStore } from '@/stores/editor-store'

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
  } = useEditorStore()

  if (!open) return null

  return (
    <div className="border-app-mid bg-app-surface absolute top-10 right-2 z-50 w-64 rounded-md border p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-app text-sm font-medium">Editor Settings</h3>
        <button
          onClick={onClose}
          className="text-app-muted hover:text-app text-xs"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-app-muted text-xs">Line Numbers</span>
          <select
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
            onClick={() => setMinimap(!minimap)}
            className={`h-5 w-9 rounded-full transition-colors ${
              minimap ? 'bg-[#FF2D55]' : 'bg-white/20'
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
            onClick={() => setWordWrap(wordWrap === 'on' ? 'off' : 'on')}
            className={`h-5 w-9 rounded-full transition-colors ${
              wordWrap === 'on' ? 'bg-[#FF2D55]' : 'bg-white/20'
            }`}
          >
            <div
              className={`h-4 w-4 rounded-full bg-white transition-transform ${
                wordWrap === 'on' ? 'translate-x-4' : 'translate-x-0.5'
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
            type="range"
            min={10}
            max={24}
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20"
          />
        </div>
      </div>
    </div>
  )
}
