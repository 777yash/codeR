'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { toast } from 'sonner'

interface ShareButtonProps {
  roomId: string
  userRole: string | null
}

export function ShareButton({ roomId, userRole }: ShareButtonProps) {
  const [copied, setCopied] = useState(false)
  const [cachedToken, setCachedToken] = useState<string | null>(null)

  const handleShare = async () => {
    let url: string

    if (userRole === 'OWNER' || userRole === 'EDITOR') {
      try {
        if (cachedToken) {
          url = `${window.location.origin}/share/${cachedToken}`
        } else {
          const res = await fetch(`/api/rooms/${roomId}/share`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: 'EDITOR' }),
          })
          if (res.ok) {
            const { token } = await res.json()
            setCachedToken(token)
            url = `${window.location.origin}/share/${token}`
          } else {
            url = window.location.href
          }
        }
      } catch {
        url = window.location.href
      }
    } else {
      url = window.location.href
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Room link copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      className="flex h-8 items-center gap-1.5 rounded-md bg-[var(--coder-accent)] px-3 text-sm font-medium text-white transition-colors hover:bg-[var(--coder-accent)]/90"
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? 'Copied!' : 'Share'}
    </button>
  )
}
