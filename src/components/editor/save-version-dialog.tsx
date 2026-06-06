'use client'

import { useState, useRef, useEffect } from 'react'
import { Bookmark, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getYjsStateBytes } from './editor-client'

interface SaveVersionDialogProps {
  roomId: string
}

export function SaveVersionDialog({ roomId }: SaveVersionDialogProps) {
  const [open, setOpen] = useState(false)
  const [label, setLabel] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Only DOM side-effect here — state reset lives in handleClose
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  function handleClose() {
    setLabel('')
    setOpen(false)
  }

  async function handleSave() {
    setSaving(true)
    try {
      const bytes = getYjsStateBytes()
      const data = bytes ? btoa(String.fromCharCode(...bytes)) : undefined
      const res = await fetch(`/api/rooms/${roomId}/snapshots`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ label: label.trim() || undefined, data }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Failed to save version')
        return
      }

      toast.success('Version saved')
      handleClose()
    } catch {
      toast.error('Failed to save version')
    } finally {
      setSaving(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSave()
    if (e.key === 'Escape') handleClose()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Save named version"
        className="text-app-dim hover:text-app-muted flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/5 max-md:h-9 max-md:w-9"
      >
        <Bookmark className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => handleClose()}
          />
          <div className="border-app bg-app-surface relative z-10 w-full max-w-sm rounded-lg border p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-app text-sm font-semibold">Save Version</h3>
              <button
                onClick={() => handleClose()}
                className="text-app-dim hover:text-app flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/5 max-md:h-9 max-md:w-9"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <input
              ref={inputRef}
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Version label (optional)"
              maxLength={100}
              className="border-app-mid bg-app-card text-app placeholder:text-app-dim w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#FF2D55]/50"
            />

            <p className="text-app-dim mt-2 text-xs">
              Saves current document state. Leave blank for unlabeled snapshot.
            </p>

            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => handleClose()}
                className="border-app-mid text-app-muted hover:text-app rounded-md border px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-md bg-[#FF2D55] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {saving && <Loader2 className="h-3 w-3 animate-spin" />}
                Save version
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
