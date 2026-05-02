'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { toast } from 'sonner'

export function ShareButton() {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    toast.success('Room link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      className="flex h-8 items-center gap-1.5 rounded-md bg-[#FF2D55] px-3 text-sm font-medium text-white transition-colors hover:bg-[#FF2D55]/90"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
