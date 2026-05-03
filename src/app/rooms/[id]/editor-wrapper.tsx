'use client'

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
  initialContent?: string
  initialLanguage?: string
  readOnly?: boolean
  roomName?: string
  members?: CollabMember[]
  currentUserId?: string
}

export function EditorWrapper({
  roomId,
  initialContent,
  initialLanguage,
  readOnly = false,
  roomName,
  members = [],
  currentUserId,
}: EditorWrapperProps) {
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
              initialContent={initialContent}
              initialLanguage={initialLanguage}
              readOnly={readOnly}
            />
          </div>
        </div>

        <CollabPanel
          roomId={roomId}
          members={members}
          currentUserId={currentUserId}
        />
      </div>

      <StatusBar />
    </div>
  )
}
