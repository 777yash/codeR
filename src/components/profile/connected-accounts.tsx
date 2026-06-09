'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { Check, Loader2, KeyRound } from 'lucide-react'
import { toast } from 'sonner'

interface ConnectedAccountsProps {
  providers: string[]
  hasPassword: boolean
  callbackUrl: string
}

const PROVIDERS = [
  { id: 'github', label: 'GitHub' },
  { id: 'google', label: 'Google' },
] as const

export function ConnectedAccounts({
  providers,
  hasPassword: initialHasPassword,
  callbackUrl,
}: ConnectedAccountsProps) {
  const [hasPassword, setHasPassword] = useState(initialHasPassword)
  const [showForm, setShowForm] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [saving, setSaving] = useState(false)

  function resetForm() {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setShowForm(false)
  }

  async function handleSavePassword() {
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(hasPassword && { currentPassword }),
          newPassword,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'Failed to update password')
        return
      }
      toast.success(hasPassword ? 'Password changed' : 'Password set')
      setHasPassword(true)
      resetForm()
    } catch {
      toast.error('Failed to update password')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border-app bg-app-surface rounded-md border p-6">
      <h2 className="text-app mb-4 text-sm font-semibold">Sign-in methods</h2>

      <div className="space-y-2">
        {PROVIDERS.map(({ id, label }) => {
          const linked = providers.includes(id)
          return (
            <div
              key={id}
              className="border-app bg-app-card flex items-center justify-between rounded-md border px-3 py-2.5"
            >
              <span className="text-app flex items-center gap-2 text-sm">
                <ProviderIcon id={id} />
                {label}
              </span>
              {linked ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-500">
                  <Check className="h-3.5 w-3.5" />
                  Connected
                </span>
              ) : (
                <button
                  onClick={() => signIn(id, { callbackUrl })}
                  className="border-app-mid text-app-muted hover:text-app rounded-md border px-3 py-1 text-xs transition-colors hover:bg-white/5"
                >
                  Connect
                </button>
              )}
            </div>
          )
        })}

        {/* Password */}
        <div className="border-app bg-app-card flex items-center justify-between rounded-md border px-3 py-2.5">
          <span className="text-app flex items-center gap-2 text-sm">
            <KeyRound className="h-4 w-4" />
            Password
            <span
              className={`text-xs font-medium ${hasPassword ? 'text-emerald-500' : 'text-app-dim'}`}
            >
              {hasPassword ? '· Enabled' : '· Not set'}
            </span>
          </span>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="border-app-mid text-app-muted hover:text-app rounded-md border px-3 py-1 text-xs transition-colors hover:bg-white/5"
            >
              {hasPassword ? 'Change' : 'Set password'}
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="border-app mt-3 space-y-3 rounded-md border p-4">
          {hasPassword && (
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              className="border-app-mid bg-app-card text-app placeholder:text-app-dim w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#FF2D55]/50"
            />
          )}
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password (min 8 characters)"
            autoComplete="new-password"
            className="border-app-mid bg-app-card text-app placeholder:text-app-dim w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#FF2D55]/50"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            autoComplete="new-password"
            onKeyDown={(e) => e.key === 'Enter' && handleSavePassword()}
            className="border-app-mid bg-app-card text-app placeholder:text-app-dim w-full rounded-md border px-3 py-2 text-sm outline-none focus:border-[#FF2D55]/50"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="border-app-mid text-app-muted hover:text-app rounded-md border px-3 py-1.5 text-xs transition-colors hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              onClick={handleSavePassword}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-[#FF2D55] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              {hasPassword ? 'Change password' : 'Set password'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProviderIcon({ id }: { id: string }) {
  if (id === 'github') {
    return (
      <svg
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden
      >
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.03-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
      </svg>
    )
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}
