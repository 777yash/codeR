import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'h-8 w-full min-w-0 rounded-lg border border-white/10 bg-[#0D0D0D] px-2.5 py-1 text-base text-[#F0F0F0] transition-colors outline-none placeholder:text-[#555555] focus-visible:border-[#FF2D55]/50 focus-visible:ring-2 focus-visible:ring-[#FF2D55]/20 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-[#FF2D55] md:text-sm',
        className
      )}
      {...props}
    />
  )
}

export { Input }
