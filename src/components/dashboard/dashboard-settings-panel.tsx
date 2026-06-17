'use client'

import { useState } from 'react'
import { Settings, Sparkles, Code2 } from 'lucide-react'
import { useEditorStore } from '@/stores/editor-store'
import { SlidePanel } from '@/components/dashboard/slide-panel'

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: () => void
}) {
  return (
    <button
      onClick={onChange}
      className={`h-5 w-9 rounded-full transition-colors ${
        checked
          ? 'bg-[var(--coder-accent)]'
          : 'bg-[var(--coder-bg-card-active)]'
      }`}
    >
      <div
        className={`h-4 w-4 rounded-full bg-white transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-app-muted text-sm">{label}</span>
      {children}
    </div>
  )
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-app-dim mt-5 mb-1 text-[11px] font-semibold tracking-wider uppercase first:mt-0">
      {children}
    </p>
  )
}

export function DashboardSettingsPanel() {
  const [open, setOpen] = useState(false)

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

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-app-muted hover-app-row flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm transition-colors"
      >
        <Settings className="h-4 w-4" />
        Settings
      </button>

      <SlidePanel
        open={open}
        onClose={() => setOpen(false)}
        title="Preferences"
      >
        <div className="px-6 py-4">
          <div data-slide-item>
            <SectionHeader>
              <span className="flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" />
                AI Completions
              </span>
            </SectionHeader>

            <div className="border-app-mid bg-app rounded-lg border p-4">
              <Row label="Inline Suggestions">
                <Toggle
                  checked={inlineSuggest}
                  onChange={() => setInlineSuggest(!inlineSuggest)}
                />
              </Row>
              <p className="text-app-dim mt-1 text-xs leading-relaxed">
                Codestral FIM completions. Tab to accept, Escape to dismiss.
              </p>
            </div>
          </div>

          <div data-slide-item>
            <SectionHeader>
              <span className="flex items-center gap-1.5">
                <Code2 className="h-3 w-3" />
                Editor
              </span>
            </SectionHeader>

            <div className="border-app-mid bg-app divide-app-mid divide-y rounded-lg border">
              <div className="px-4 py-2">
                <Row label="Minimap">
                  <Toggle
                    checked={minimap}
                    onChange={() => setMinimap(!minimap)}
                  />
                </Row>
              </div>
              <div className="px-4 py-2">
                <Row label="Word Wrap">
                  <Toggle
                    checked={wordWrap === 'on'}
                    onChange={() =>
                      setWordWrap(wordWrap === 'on' ? 'off' : 'on')
                    }
                  />
                </Row>
              </div>
              <div className="px-4 py-2">
                <Row label="Line Numbers">
                  <select
                    value={lineNumbers}
                    onChange={(e) =>
                      setLineNumbers(
                        e.target.value as 'on' | 'off' | 'relative'
                      )
                    }
                    className="border-app-mid bg-app text-app h-7 rounded border px-2 text-xs"
                  >
                    <option value="on">On</option>
                    <option value="off">Off</option>
                    <option value="relative">Relative</option>
                  </select>
                </Row>
              </div>
              <div className="px-4 py-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-app-muted text-sm">Font Size</span>
                  <span className="text-app text-xs">{fontSize}px</span>
                </div>
                <input
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

          <p data-slide-item className="text-app-dim mt-6 text-xs">
            Preferences are saved to your browser automatically.
          </p>
        </div>
      </SlidePanel>
    </>
  )
}
