'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { LANGUAGES } from '@/lib/editor-options'

interface CreateRoomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (data: {
    name: string
    description?: string
    language: string
    isPublic: boolean
  }) => Promise<void>
}

export function CreateRoomDialog({
  open,
  onOpenChange,
  onSubmit,
}: CreateRoomDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [language, setLanguage] = useState('javascript')
  const [isPublic, setIsPublic] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errors, setErrors] = useState<{ name?: string }>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      setErrors({ name: 'Room name is required' })
      return
    }

    setErrors({})
    setIsSubmitting(true)

    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || undefined,
        language,
        isPublic,
      })
      setName('')
      setDescription('')
      setLanguage('javascript')
      setIsPublic(false)
      onOpenChange(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      setName('')
      setDescription('')
      setLanguage('javascript')
      setIsPublic(false)
      setErrors({})
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogClose onClose={() => handleClose(false)} />
        <DialogHeader>
          <DialogTitle>Create New Room</DialogTitle>
          <DialogDescription>
            Set up a new room for collaborative coding
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="text-sm font-medium text-[var(--coder-text-primary)]"
            >
              Room Name
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors({})
              }}
              placeholder="My Awesome Project"
              className={errors.name ? 'border-[var(--coder-accent)]' : ''}
            />
            {errors.name && (
              <p className="text-xs text-[var(--coder-accent)]">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="description"
              className="text-sm font-medium text-[var(--coder-text-primary)]"
            >
              Description{' '}
              <span className="text-[var(--coder-text-tertiary)]">
                (optional)
              </span>
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of what this room is for..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="language"
              className="text-sm font-medium text-[var(--coder-text-primary)]"
            >
              Language
            </label>
            <Select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={isPublic}
              onClick={() => setIsPublic(!isPublic)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                isPublic
                  ? 'bg-[var(--coder-accent)]'
                  : 'bg-[var(--coder-text-tertiary)]'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                  isPublic ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
            <label
              className="cursor-pointer text-sm text-[var(--coder-text-secondary)]"
              onClick={() => setIsPublic(!isPublic)}
            >
              {isPublic ? 'Public room' : 'Private room'}
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[var(--coder-accent)] hover:bg-[var(--coder-accent)]/90 sm:w-auto"
            >
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Create Room
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
