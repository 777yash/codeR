'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import { usePostHog } from 'posthog-js/react'
import { toast } from 'sonner'
import { FolderOpen, Code2, Users } from 'lucide-react'
import { FileTabs } from '@/components/editor/file-tabs'
import { EditorToolbar } from '@/components/editor/editor-toolbar'
import { FileExplorer } from '@/components/editor/file-explorer'
import {
  CollabPanel,
  type CollabMember,
} from '@/components/editor/collab-panel'
import { StatusBar } from '@/components/editor/status-bar'
import { TerminalPanel } from '@/components/editor/terminal-panel'
import { PreviewPanel } from '@/components/editor/preview-panel'
import {
  getWebContainer,
  teardownWebContainer,
  subscribeWebContainerStatus,
  getWebContainerStatus,
  slugifyWorkdirName,
} from '@/lib/webcontainer'

function EditorSkeleton() {
  return (
    <div
      className="flex-1 animate-pulse bg-[var(--coder-bg-surface)]"
      aria-label="Loading editor…"
    />
  )
}

const EditorClient = dynamic(
  () =>
    import('@/components/editor/editor-client').then((m) => ({
      default: m.EditorClient,
    })),
  { ssr: false, loading: () => <EditorSkeleton /> }
)

type MobilePane = 'editor' | 'files' | 'collab'

interface EditorWrapperProps {
  roomId: string
  initialLanguage?: string
  readOnly?: boolean
  roomName?: string
  members?: CollabMember[]
  currentUserId?: string
  currentUserName?: string
  roomLanguage?: string
  canSave?: boolean
}

export function EditorWrapper({
  roomId,
  initialLanguage,
  readOnly = false,
  roomName,
  members = [],
  currentUserId,
  currentUserName,
  roomLanguage,
  canSave = false,
}: EditorWrapperProps) {
  const router = useRouter()
  const posthog = usePostHog()
  const [mobilePane, setMobilePane] = useState<MobilePane>('editor')
  const webContainerStatus = useSyncExternalStore(
    subscribeWebContainerStatus,
    getWebContainerStatus,
    () => null
  )

  useEffect(() => {
    // COOP/COEP headers only apply on document load — client-side navigation
    // into a room keeps the previous (non-isolated) document and the runtime
    // can never boot. One hard reload picks the headers up; the flag stops a
    // loop on browsers that never become isolated.
    if (window.crossOriginIsolated) {
      sessionStorage.removeItem('coder-coi-reload')
      return
    }
    if (sessionStorage.getItem('coder-coi-reload')) return
    sessionStorage.setItem('coder-coi-reload', '1')
    window.location.reload()
  }, [])

  useEffect(() => {
    posthog?.capture('room_joined', { room_id: roomId, read_only: readOnly })
  }, [posthog, roomId, readOnly])

  useEffect(() => {
    // Rooms are polyglot — the container boots everywhere it can: the
    // terminal is useful regardless of language, Run branches per file
    const workdir =
      localStorage.getItem(`coder-workdir:${roomId}`) ||
      slugifyWorkdirName(roomName ?? roomId)
    getWebContainer(slugifyWorkdirName(workdir)).catch(() => {
      // 'unsupported' (Safari / missing isolation) is expected — only real boot
      // failures warrant a toast
      if (getWebContainerStatus() === 'error') {
        toast.error(
          'In-browser runtime failed to boot — Run falls back to remote execution'
        )
      }
    })
    return () => {
      void teardownWebContainer()
    }
  }, [roomId, roomName])

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomId}`)
        if (res.status === 403 || res.status === 404) {
          toast.error("You've been removed from this room")
          router.push('/dashboard')
        }
      } catch {
        // network error — ignore, retry next interval
      }
    }

    const interval = setInterval(check, 10_000)
    return () => clearInterval(interval)
  }, [roomId, router])

  const mobileTabs: { id: MobilePane; label: string; icon: React.ReactNode }[] =
    [
      { id: 'files', label: 'Files', icon: <FolderOpen className="h-4 w-4" /> },
      { id: 'editor', label: 'Editor', icon: <Code2 className="h-4 w-4" /> },
      { id: 'collab', label: 'Collab', icon: <Users className="h-4 w-4" /> },
    ]

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <EditorToolbar />

      {/* Main area — 3-column on desktop, single-pane + drawers on mobile */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Mobile drawer backdrop */}
        {mobilePane !== 'editor' && (
          <div
            className="absolute inset-0 z-20 bg-black/60 md:hidden"
            onClick={() => setMobilePane('editor')}
          />
        )}

        <FileExplorer
          roomName={roomName}
          mobileOpen={mobilePane === 'files'}
          onFileSelect={() => setMobilePane('editor')}
        />

        {/* Center: file tabs + editor — always mounted (unmount drops WS) */}
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <FileTabs />
          <div className="flex flex-1 overflow-hidden">
            <div className="min-w-0 flex-1 overflow-hidden">
              <EditorClient
                roomId={roomId}
                userId={currentUserId ?? ''}
                userName={currentUserName}
                initialLanguage={initialLanguage}
                readOnly={readOnly}
              />
            </div>
            {webContainerStatus !== null && <PreviewPanel />}
          </div>
        </div>

        <CollabPanel
          roomId={roomId}
          members={members}
          currentUserId={currentUserId}
          currentUserName={currentUserName}
          roomLanguage={roomLanguage}
          canSave={canSave}
          mobileOpen={mobilePane === 'collab'}
        />
      </div>

      <StatusBar webContainerStatus={webContainerStatus} />

      {webContainerStatus !== null && <TerminalPanel />}

      {/* Mobile pane switcher */}
      <div
        className="border-app bg-app-surface flex h-12 shrink-0 items-stretch border-t md:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {mobileTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setMobilePane(t.id)}
            className={`flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors ${
              mobilePane === t.id
                ? 'text-[var(--coder-accent)]'
                : 'text-app-dim hover:text-app-muted'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>
    </div>
  )
}
