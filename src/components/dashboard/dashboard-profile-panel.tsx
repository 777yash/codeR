'use client'

import { useState } from 'react'
import { User, X } from 'lucide-react'
import { ProfileForm } from '@/components/profile/profile-form'
import { format } from 'date-fns'

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

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
          />

          <div className="border-app bg-app-surface relative z-10 flex h-full w-full max-w-sm flex-col overflow-hidden border-l">
            <div className="border-app flex h-12 shrink-0 items-center justify-between border-b px-6">
              <h2 className="text-app text-sm font-semibold">Profile</h2>
              <button
                onClick={() => setOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-white/5 max-md:h-9 max-md:w-9"
              >
                <X className="text-app-dim h-4 w-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loading && (
                <div className="text-app-dim py-12 text-center text-sm">
                  Loading…
                </div>
              )}

              {!loading && profile && (
                <div className="space-y-5">
                  {/* Avatar + identity */}
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold"
                      style={{
                        backgroundColor: 'rgba(255,45,85,0.15)',
                        color: '#FF2D55',
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
                  <div className="border-app bg-app rounded-lg border p-4">
                    <ProfileForm
                      initialName={profile.name}
                      email={profile.email}
                    />
                  </div>

                  {/* Account info */}
                  <div className="border-app bg-app rounded-lg border">
                    <p className="text-app border-app border-b px-4 py-2.5 text-xs font-semibold">
                      Account
                    </p>
                    <div className="divide-app-mid divide-y px-4">
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-app-dim text-xs">
                          Member since
                        </span>
                        <span className="text-app-muted text-sm">
                          {format(new Date(profile.createdAt), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2.5">
                        <span className="text-app-dim text-xs">
                          Password auth
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            profile.hasPassword
                              ? 'text-emerald-500'
                              : 'text-app-dim'
                          }`}
                        >
                          {profile.hasPassword ? 'Enabled' : 'Not set'}
                        </span>
                      </div>
                      {profile.providers.length > 0 && (
                        <div className="flex items-center justify-between py-2.5">
                          <span className="text-app-dim text-xs">
                            Linked accounts
                          </span>
                          <div className="flex gap-1.5">
                            {profile.providers.includes('github') && (
                              <span className="border-app-mid text-app-muted flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                                <svg
                                  className="h-3 w-3"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.03-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                                GitHub
                              </span>
                            )}
                            {profile.providers.includes('google') && (
                              <span className="border-app-mid text-app-muted flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs">
                                <svg
                                  className="h-3 w-3"
                                  viewBox="0 0 24 24"
                                  fill="currentColor"
                                >
                                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                                Google
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
