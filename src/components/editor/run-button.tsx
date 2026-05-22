'use client'

import { Play } from 'lucide-react'
import { toast } from 'sonner'

export function RunButton() {
  return (
    <button
      onClick={() => toast.info('Code execution coming in Phase 6')}
      className="flex h-7 items-center gap-1.5 rounded-md bg-[#32D74B] px-3 text-xs font-semibold text-black transition-colors hover:bg-[#32D74B]/90"
    >
      <Play className="h-3 w-3" />
      Run
    </button>
  )
}
