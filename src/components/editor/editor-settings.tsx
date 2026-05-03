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
    <div className="absolute top-10 right-2 z-50 w-64 rounded-md border border-white/10 bg-[#0D0D0D] p-3 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white">Editor Settings</h3>
        <button
          onClick={onClose}
          className="text-xs text-[#888888] hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs text-[#888888]">Line Numbers</span>
          <select
            value={lineNumbers}
            onChange={(e) =>
              setLineNumbers(e.target.value as 'on' | 'off' | 'relative')
            }
            className="h-6 rounded border border-white/10 bg-black/50 px-2 text-xs text-white"
          >
            <option value="on">On</option>
            <option value="off">Off</option>
            <option value="relative">Relative</option>
          </select>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-[#888888]">Minimap</span>
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
          <span className="text-xs text-[#888888]">Word Wrap</span>
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
            <span className="text-xs text-[#888888]">Font Size</span>
            <span className="text-xs text-white">{fontSize}px</span>
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
