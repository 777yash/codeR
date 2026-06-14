'use client'

import { useState } from 'react'
import { FolderDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog'
import { ProjectFolderPanel } from './project-folder-panel'

interface ProjectFolderButtonProps {
  roomId: string
  roomName: string
}

export function ProjectFolderButton({
  roomId,
  roomName,
}: ProjectFolderButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Save project to disk"
        className="flex h-7 w-7 items-center justify-center rounded text-[var(--coder-text-tertiary)] transition-colors hover:bg-[var(--coder-bg-card-hover)] hover:text-[var(--coder-text-secondary)]"
      >
        <FolderDown className="h-3.5 w-3.5" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Project folder</DialogTitle>
          </DialogHeader>
          <ProjectFolderPanel roomId={roomId} roomName={roomName} />
        </DialogContent>
      </Dialog>
    </>
  )
}
