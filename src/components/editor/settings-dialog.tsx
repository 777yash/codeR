'use client'

import { useState } from 'react'
import { Settings, X } from 'lucide-react'
import { RoomSettingsClient } from '@/app/rooms/[id]/settings/settings-client'
import type { RoomWithRelations } from '@/app/rooms/[id]/settings/settings-client'

interface SettingsDialogProps {
  room: RoomWithRelations
  userRole: 'OWNER' | 'EDITOR' | 'VIEWER'
}

export function SettingsDialog({ room, userRole }: SettingsDialogProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/5 max-md:h-9 max-md:w-9"
        title="Room settings"
      >
        <Settings className="text-app-dim h-3.5 w-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="border-app bg-app-surface relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l">
            <div className="border-app flex h-12 shrink-0 items-center justify-between border-b px-6">
              <h2 className="text-app text-sm font-semibold">Room Settings</h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/5 max-md:h-9 max-md:w-9"
              >
                <X className="text-app-dim h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <RoomSettingsClient room={room} userRole={userRole} />
            </div>
          </div>
        </div>
      )}
    </>
  )
}
