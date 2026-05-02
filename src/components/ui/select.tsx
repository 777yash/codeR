'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'h-8 w-full rounded-lg border border-white/10 bg-[#1A0A0D] px-3 py-1 text-sm text-[#F0F0F0] transition-colors outline-none focus:border-[#FF2D55]/50 focus:ring-1 focus:ring-[#FF2D55]/20 disabled:cursor-not-allowed disabled:opacity-50',
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
