import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-9 w-full min-w-0 rounded-lg border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] px-3 py-1 text-base text-[var(--coder-text-primary)] transition-[border-color,box-shadow] duration-150 outline-none placeholder:text-[var(--coder-text-tertiary)] focus-visible:border-[var(--coder-border-accent)] focus-visible:ring-3 focus-visible:ring-[var(--coder-accent)]/15 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[var(--coder-accent)] md:text-sm',
        className
      )}
      {...props}
    />
  )
}

export { Input }
