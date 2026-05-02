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
          'flex min-h-[80px] w-full rounded-lg border border-white/10 bg-transparent px-3 py-2 text-sm text-[#F0F0F0] transition-colors outline-none placeholder:text-[#555555] focus:border-[#FF2D55]/50 focus:ring-1 focus:ring-[#FF2D55]/20 disabled:cursor-not-allowed disabled:opacity-50',
          className
        )}
        {...props}
      />
    )
  }
)
Textarea.displayName = 'Textarea'

export { Textarea }
