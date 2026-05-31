'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileTabs } from '@/components/editor/file-tabs'
import { EditorToolbar } from '@/components/editor/editor-toolbar'
import { EditorClient } from '@/components/editor/editor-client'
import { FileExplorer } from '@/components/editor/file-explorer'
import {
  CollabPanel,
  type CollabMember,
} from '@/components/editor/collab-panel'
import { StatusBar } from '@/components/editor/status-bar'

interface EditorWrapperProps {
  roomId: string
  initialLanguage?: string
  readOnly?: boolean
  roomName?: string
  members?: CollabMember[]
  currentUserId?: string
  currentUserName?: string
}

export function EditorWrapper({
  roomId,
  initialLanguage,
  readOnly = false,
  roomName,
  members = [],
  currentUserId,
  currentUserName,
}: EditorWrapperProps) {
  const router = useRouter()

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

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <EditorToolbar />

      {/* 3-column main area */}
      <div className="flex flex-1 overflow-hidden">
        <FileExplorer roomName={roomName} />

        {/* Center: file tabs + editor */}
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
        />
      </div>

      <StatusBar />
    </div>
  )
}
