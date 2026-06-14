'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Globe, Maximize2, Minimize2, RotateCcw, X } from 'lucide-react'
import { useEditorStore } from '@/stores/editor-store'
import { useIsMobile } from '@/hooks/use-is-mobile'
import {
  subscribeWebContainerPreview,
  getWebContainerPreview,
} from '@/lib/webcontainer'

export function PreviewPanel() {
  const preview = useSyncExternalStore(
    subscribeWebContainerPreview,
    getWebContainerPreview,
    () => null
  )
  const previewOpen = useEditorStore((s) => s.previewOpen)
  const setPreviewOpen = useEditorStore((s) => s.setPreviewOpen)
  const isMobile = useIsMobile()
  const [maximized, setMaximized] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    if (preview) setPreviewOpen(true)
  }, [preview, setPreviewOpen])

  if (!preview || !previewOpen) return null

  // COOP same-origin (required for the runtime) severs window.opener, so the
  // preview URL cannot connect from a separate tab — fullscreen is the
  // expanded view instead of open-in-new-tab.
  const fullscreen = maximized || isMobile

  return (
    <div
      className={
        fullscreen
          ? 'fixed inset-0 z-50 flex flex-col bg-[var(--coder-bg-surface)]'
          : 'flex w-[45%] min-w-[320px] flex-col border-l border-[var(--coder-border)] bg-[var(--coder-bg-surface)] max-md:hidden'
      }
    >
      <div className="flex h-9 shrink-0 items-center justify-between gap-2 border-b border-[var(--coder-border)] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <Globe className="h-3.5 w-3.5 shrink-0 text-[var(--coder-text-tertiary)]" />
          <span className="truncate text-[11px] text-[var(--coder-text-secondary)]">
            {preview.url}
          </span>
          <span className="shrink-0 rounded bg-[var(--coder-bg-card-hover)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--coder-text-tertiary)]">
            :{preview.port}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={() => setReloadKey((k) => k + 1)}
            title="Reload preview"
            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
          >
            <RotateCcw className="h-3 w-3 text-[var(--coder-text-tertiary)]" />
          </button>
          {!isMobile && (
            <button
              onClick={() => setMaximized((m) => !m)}
              title={maximized ? 'Restore preview' : 'Maximize preview'}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
            >
              {maximized ? (
                <Minimize2 className="h-3 w-3 text-[var(--coder-text-tertiary)]" />
              ) : (
                <Maximize2 className="h-3 w-3 text-[var(--coder-text-tertiary)]" />
              )}
            </button>
          )}
          <button
            onClick={() => {
              setMaximized(false)
              setPreviewOpen(false)
            }}
            title="Close preview"
            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
          >
            <X className="h-3 w-3 text-[var(--coder-text-tertiary)]" />
          </button>
        </div>
      </div>
      <iframe
        key={reloadKey}
        src={preview.url}
        sandbox="allow-scripts allow-same-origin allow-forms"
        className="min-h-0 flex-1 bg-white"
        title="Live preview"
      />
    </div>
  )
}
