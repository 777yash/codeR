'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Save, Loader2 } from 'lucide-react'

interface ProfileFormProps {
  initialName: string | null
  email: string | null
}

export function ProfileForm({ initialName, email }: ProfileFormProps) {
  const [name, setName] = useState(initialName ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (name.trim().length < 2) {
      toast.error('Name must be at least 2 characters')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to save')
      }
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
        <label className="mb-1.5 block text-xs font-medium tracking-wider text-[#555555] uppercase">
          Display Name
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            placeholder="Your name"
            className="h-9 flex-1 rounded-md border border-white/10 bg-[#111111] px-3 text-sm text-[#F0F0F0] transition-colors outline-none placeholder:text-[#555555] focus:border-[#FF2D55]/50 focus:ring-1 focus:ring-[#FF2D55]/20"
          />
          <button
            onClick={handleSave}
            disabled={saving || name.trim() === (initialName ?? '')}
            className="flex h-9 items-center gap-1.5 rounded-md bg-[#FF2D55] px-3 text-xs font-semibold text-white transition-all hover:bg-[#FF2D55]/90 disabled:cursor-not-allowed disabled:opacity-40"
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
        <label className="mb-1.5 block text-xs font-medium tracking-wider text-[#555555] uppercase">
          Email
        </label>
        <div className="flex h-9 items-center rounded-md border border-white/[0.06] bg-[#0D0D0D] px-3 text-sm text-[#555555]">
          {email ?? '—'}
        </div>
        <p className="mt-1 text-xs text-[#444444]">Email cannot be changed</p>
      </div>
    </div>
  )
}
