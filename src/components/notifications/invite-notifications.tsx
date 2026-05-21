'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { Bell, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { respondToInvitation } from '@/app/actions/invitations'

interface Invitation {
  id: string
  role: string
  createdAt: string
  room: { id: string; name: string; language: string }
  inviter: { id: string; name: string | null; image: string | null }
}

interface InviteNotificationsProps {
  initialInvitations: Invitation[]
}

export function InviteNotifications({
  initialInvitations,
}: InviteNotificationsProps) {
  const [invitations, setInvitations] =
    useState<Invitation[]>(initialInvitations)
  const [open, setOpen] = useState(false)
  const [acting, setActing] = useState<string | null>(null)
  const [, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/invitations')
        if (res.ok) {
          const data = (await res.json()) as Invitation[]
          setInvitations(data)
        }
      } catch {
        // silently ignore, retry on next interval
      }
    }
    void load()
    const interval = setInterval(load, 10_000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleAction(id: string, action: 'accept' | 'decline') {
    setActing(id)
    startTransition(async () => {
      try {
        await respondToInvitation(id, action)
        if (action === 'decline') {
          setInvitations((prev) => prev.filter((inv) => inv.id !== id))
          toast.success('Invite declined')
        }
      } catch (e) {
        // redirect() throws NEXT_REDIRECT — re-throw so Next.js can navigate
        const digest = (e as { digest?: string })?.digest ?? ''
        if (digest.startsWith('NEXT_REDIRECT')) throw e
        toast.error('Failed to respond to invite')
      } finally {
        setActing(null)
      }
    })
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-app-muted hover-app-text relative transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {invitations.length > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF2D55] text-[10px] font-bold text-white">
            {invitations.length > 9 ? '9+' : invitations.length}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-9 right-0 z-50 w-80 rounded-lg border border-white/10 bg-[#0D0D0D] shadow-xl">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-sm font-semibold text-[#F0F0F0]">
              Invitations
              {invitations.length > 0 && (
                <span className="ml-2 rounded-full bg-[#FF2D55]/20 px-1.5 py-0.5 text-xs text-[#FF2D55]">
                  {invitations.length}
                </span>
              )}
            </p>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {invitations.length === 0 ? (
              <p className="px-4 py-6 text-center text-sm text-[#555555]">
                No pending invitations
              </p>
            ) : (
              invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="border-b border-white/[0.06] px-4 py-3 last:border-0"
                >
                  <p className="mb-0.5 text-sm font-medium text-[#F0F0F0]">
                    {inv.room.name}
                  </p>
                  <p className="mb-3 text-xs text-[#888888]">
                    <span className="text-[#F0F0F0]">
                      {inv.inviter.name ?? 'Someone'}
                    </span>{' '}
                    invited you as{' '}
                    <span className="text-[#FF2D55]">
                      {inv.role.toLowerCase()}
                    </span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(inv.id, 'accept')}
                      disabled={acting === inv.id}
                      className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded bg-[#FF2D55] text-xs font-medium text-white transition-colors hover:bg-[#FF2D55]/90 disabled:opacity-50"
                    >
                      {acting === inv.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      Accept
                    </button>
                    <button
                      onClick={() => handleAction(inv.id, 'decline')}
                      disabled={acting === inv.id}
                      className="flex h-7 flex-1 items-center justify-center gap-1.5 rounded border border-white/10 text-xs text-[#888888] transition-colors hover:border-white/20 hover:text-[#F0F0F0] disabled:opacity-50"
                    >
                      <X className="h-3 w-3" />
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
