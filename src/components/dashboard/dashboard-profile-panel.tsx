'use client'

import { useState } from 'react'
import { User } from 'lucide-react'
import { ProfileForm } from '@/components/profile/profile-form'
import { ConnectedAccounts } from '@/components/profile/connected-accounts'
import { format } from 'date-fns'
import { SlidePanel } from '@/components/dashboard/slide-panel'

interface ProfileData {
  id: string
  name: string | null
  email: string | null
  image: string | null
  createdAt: string
  hasPassword: boolean
  providers: string[]
}

export function DashboardProfilePanel() {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(false)

  function handleOpen() {
    setOpen(true)
    if (profile) return
    setLoading(true)
    fetch('/api/user/profile')
      .then((r) => r.json())
      .then((data: ProfileData) => setProfile(data))
      .finally(() => setLoading(false))
  }

  const initials = (profile?.name ?? profile?.email ?? 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <>
      <button
        onClick={handleOpen}
        className="text-app-muted hover-app-row flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm transition-colors"
      >
        <User className="h-4 w-4" />
        Profile
      </button>

      <SlidePanel open={open} onClose={() => setOpen(false)} title="Profile">
        <div className="px-6 py-5">
          {loading && (
            <div className="text-app-dim py-12 text-center text-sm">
              Loading…
            </div>
          )}

          {!loading && profile && (
            <div className="space-y-5">
              {/* Avatar + identity */}
              <div data-slide-item className="flex items-center gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                  style={{
                    backgroundColor: 'var(--coder-accent-glow)',
                    color: 'var(--coder-accent)',
                  }}
                >
                  {initials}
                </div>
                <div>
                  <p className="text-app font-semibold">
                    {profile.name ?? 'No name set'}
                  </p>
                  <p className="text-app-dim text-sm">{profile.email}</p>
                </div>
              </div>

              {/* Edit form */}
              <div
                data-slide-item
                className="border-app bg-app rounded-lg border p-4"
              >
                <ProfileForm initialName={profile.name} email={profile.email} />
              </div>

              {/* Account info */}
              <div
                data-slide-item
                className="border-app bg-app rounded-lg border"
              >
                <p className="text-app border-app border-b px-4 py-2.5 text-xs font-semibold">
                  Account
                </p>
                <div className="px-4">
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-app-dim text-xs">Member since</span>
                    <span className="text-app-muted text-sm">
                      {format(new Date(profile.createdAt), 'MMM d, yyyy')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Sign-in methods — connect providers + set password */}
              <div data-slide-item>
                <ConnectedAccounts
                  providers={profile.providers}
                  hasPassword={profile.hasPassword}
                  callbackUrl="/dashboard"
                />
              </div>
            </div>
          )}
        </div>
      </SlidePanel>
    </>
  )
}
