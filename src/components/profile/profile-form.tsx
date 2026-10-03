'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'

interface ProfileFormProps {
  initialName: string | null
  email: string | null
  onSaved?: (name: string) => void
}

export function ProfileForm({ initialName, email, onSaved }: ProfileFormProps) {
  const router = useRouter()
  const [name, setName] = useState(initialName ?? '')
  const [savedName, setSavedName] = useState(initialName ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (saving) return
    const submittedName = name.trim()
    if (submittedName.length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: submittedName }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
      setSavedName(submittedName)
      onSaved?.(submittedName)
      router.refresh()
      toast.success('Profile updated')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <label className="text-app-dim mb-1.5 block text-xs font-medium tracking-wider uppercase">
          Display Name
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Your name"
            className="border-app-mid bg-app-card text-app placeholder:text-app-dim h-9 flex-1 rounded-md border px-3 text-sm transition-colors outline-none focus:border-[var(--coder-accent)]/50 focus:ring-1 focus:ring-[var(--coder-accent)]/20"
          />
          <button
            onClick={handleSave}
            disabled={saving || name.trim() === savedName}
            className="flex h-9 items-center gap-1.5 rounded-md bg-[var(--coder-accent)] px-3 text-xs font-semibold text-white transition-all hover:bg-[var(--coder-accent)]/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {saving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>
      </div>

      <div>
        <label className="text-app-dim mb-1.5 block text-xs font-medium tracking-wider uppercase">
          Email
        </label>
        <div className="border-app bg-app-surface text-app-dim flex h-9 items-center rounded-md border px-3 text-sm">
          {email ?? '—'}
        </div>
        <p className="text-app-dim mt-1 text-xs">Email cannot be changed</p>
      </div>
    </div>
  )
}
