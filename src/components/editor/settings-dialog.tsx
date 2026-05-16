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
        className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/5"
        title="Room settings"
      >
        <Settings className="h-3.5 w-3.5 text-[#555555]" />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex h-full w-full max-w-2xl flex-col overflow-hidden border-l border-white/[0.06] bg-[#0D0D0D]">
            <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-6">
              <h2 className="text-sm font-semibold text-[#F0F0F0]">
                Room Settings
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/5"
              >
                <X className="h-4 w-4 text-[#555555]" />
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
