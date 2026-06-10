'use client'

import { useState } from 'react'
import { X, Loader2, Lock, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { signIn } from 'next-auth/react'
import { usePostHog } from 'posthog-js/react'
import { getAllFilesContent } from '@/components/editor/editor-client'

interface GistExportButtonProps {
  roomId: string
  githubLinked: boolean
}

export function GistExportButton({
  roomId,
  githubLinked,
}: GistExportButtonProps) {
  const posthog = usePostHog()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [exporting, setExporting] = useState(false)

  function handleClose() {
    setDescription('')
    setIsPublic(false)
    setOpen(false)
  }

  async function handleExport() {
    const files = getAllFilesContent()
    setExporting(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/gist`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          description: description.trim() || undefined,
          isPublic,
          files,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to export gist')
        return
      }

      posthog?.capture('gist_exported', {
        is_public: isPublic,
        file_count: files.length,
      })
      await navigator.clipboard.writeText(data.url).catch(() => {})
      toast.success('Gist created — link copied', {
        description: data.url,
        classNames: { description: '!text-black' },
        action: {
          label: 'Open',
          onClick: () => window.open(data.url, '_blank'),
        },
      })
      handleClose()
    } catch {
      toast.error('Failed to export gist')
    } finally {
      setExporting(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Export to GitHub Gist"
        className="text-app-dim hover:text-app-muted flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)] max-md:h-9 max-md:w-9"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="currentColor"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={handleClose} />
          <div className="border-app-mid bg-app-card relative z-10 w-full max-w-sm rounded-xl border p-5 shadow-[var(--coder-shadow-md)]">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-app text-sm font-semibold">
                Export to GitHub Gist
              </h3>
              <button
                onClick={handleClose}
                className="text-app-dim hover:text-app flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)] max-md:h-9 max-md:w-9"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {!githubLinked ? (
              <div className="space-y-4">
                <p className="text-app-muted text-sm">
                  Connect your GitHub account to export this workspace as a
                  gist.
                </p>
                <button
                  onClick={() =>
                    signIn('github', { callbackUrl: window.location.href })
                  }
                  className="flex w-full items-center justify-center gap-2 rounded-md bg-[var(--coder-accent)] px-3 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
                >
                  <svg
                    className="h-4 w-4"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden
                  >
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  Connect GitHub
                </button>
                <p className="text-app-dim text-xs">
                  You&apos;ll return here after connecting.
                </p>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description (optional)"
                  maxLength={1000}
                  className="border-app-mid bg-app-card text-app placeholder:text-app-dim w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[var(--coder-accent)]/50"
                />

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPublic(false)}
                    className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors ${
                      !isPublic
                        ? 'text-app border-[var(--coder-accent)]/50 bg-[var(--coder-accent)]/10'
                        : 'border-app-mid text-app-muted hover:bg-[var(--coder-bg-card-hover)]'
                    }`}
                  >
                    <Lock className="h-3 w-3" />
                    Secret
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsPublic(true)}
                    className={`flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-xs transition-colors ${
                      isPublic
                        ? 'text-app border-[var(--coder-accent)]/50 bg-[var(--coder-accent)]/10'
                        : 'border-app-mid text-app-muted hover:bg-[var(--coder-bg-card-hover)]'
                    }`}
                  >
                    <Globe className="h-3 w-3" />
                    Public
                  </button>
                </div>

                <p className="text-app-dim mt-2 text-xs">
                  {isPublic
                    ? 'Public gists are listed on your GitHub profile and searchable.'
                    : 'Secret gists are unlisted — only people with the link can view.'}
                </p>

                <div className="mt-4 flex justify-end gap-2">
                  <button
                    onClick={handleClose}
                    className="border-app-mid text-app-muted hover:text-app rounded-md border px-3 py-1.5 text-xs transition-colors hover:bg-[var(--coder-bg-card-hover)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="flex items-center gap-1.5 rounded-md bg-[var(--coder-accent)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {exporting && <Loader2 className="h-3 w-3 animate-spin" />}
                    Export gist
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
