'use client'

import { useEffect, useState } from 'react'
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

  useEffect(() => {
    posthog?.capture('room_joined', { room_id: roomId, read_only: readOnly })
  }, [posthog, roomId, readOnly])

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
          <div className="flex-1 overflow-hidden">
            <EditorClient
              roomId={roomId}
              userId={currentUserId ?? ''}
              userName={currentUserName}
              initialLanguage={initialLanguage}
              readOnly={readOnly}
            />
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

      <StatusBar />

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
