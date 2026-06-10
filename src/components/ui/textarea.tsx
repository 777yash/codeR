'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[80px] w-full rounded-lg border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] px-3 py-2 text-sm text-[var(--coder-text-primary)] transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-[var(--coder-text-tertiary)] focus:border-[var(--coder-border-accent)] focus:ring-3 focus:ring-[var(--coder-accent)]/15 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
