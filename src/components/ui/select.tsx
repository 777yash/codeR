'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'h-9 w-full rounded-lg border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] px-3 py-1 text-sm text-[var(--coder-text-primary)] transition-[border-color,box-shadow] duration-150 outline-none focus:border-[var(--coder-border-accent)] focus:ring-3 focus:ring-[var(--coder-accent)]/15 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)
Select.displayName = 'Select'

export { Select }
