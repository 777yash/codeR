'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}
const DialogContext = React.createContext<{ titleId: string } | null>(null)

function Dialog({ open, onOpenChange, children }: DialogProps) {
  const titleId = React.useId()
  React.useEffect(() => {
    if (!open) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onOpenChange?.(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onOpenChange])

  if (!open || typeof window === 'undefined') return null
  return ReactDOM.createPortal(
    <DialogContext.Provider value={{ titleId }}>
      <div
        className="app-dialog-overlay fixed inset-0 z-50 bg-black/60"
        onClick={() => onOpenChange?.(false)}
      />
      {children}
    </DialogContext.Provider>,
    document.body
  )
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function DialogContent({
  children,
  className,
  onKeyDown,
  ...props
}: DialogContentProps) {
  const context = React.useContext(DialogContext)
  const ref = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    const first =
      ref.current?.querySelector<HTMLElement>(
        'input:not([disabled]),textarea:not([disabled]),select:not([disabled])'
      ) ??
      ref.current?.querySelector<HTMLElement>('button:not([disabled]),a[href]')
    ;(first ?? ref.current)?.focus()
    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [])
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={context?.titleId}
      tabIndex={-1}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || event.key !== 'Tab') return
        const items = Array.from(
          event.currentTarget.querySelectorAll<HTMLElement>(
            'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]'
          )
        ).filter((element) => element.getClientRects().length > 0)
        const first = items[0],
          last = items[items.length - 1]
        if (!first) {
          event.preventDefault()
          return
        }
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === event.currentTarget)
        ) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }}
      className={cn(
        'app-dialog-content fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-xl border border-[var(--coder-border-mid)] bg-[var(--coder-bg-card)] p-6 shadow-[var(--coder-shadow-md)]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
DialogContent.displayName = 'DialogContent'

function DialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col space-y-1.5 text-center sm:text-left',
        className
      )}
      {...props}
    />
  )
}
DialogHeader.displayName = 'DialogHeader'

function DialogTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  const context = React.useContext(DialogContext)
  return (
    <h2
      id={context?.titleId}
      className={cn(
        'text-lg font-semibold tracking-tight text-[var(--coder-text-primary)]',
        className
      )}
      {...props}
    />
  )
}
DialogTitle.displayName = 'DialogTitle'

function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-sm leading-relaxed text-[var(--coder-text-secondary)]',
        className
      )}
      {...props}
    />
  )
}
DialogDescription.displayName = 'DialogDescription'

function DialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
        className
      )}
      {...props}
    />
  )
}
DialogFooter.displayName = 'DialogFooter'

function DialogClose({
  children,
  onClose,
  className,
}: {
  children?: React.ReactNode
  onClose?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      aria-label="Close dialog"
      onClick={onClose}
      className={cn(
        'absolute top-4 right-4 rounded-md p-1 opacity-70 transition-[opacity,background-color] hover:bg-[var(--coder-bg-card-hover)] hover:opacity-100',
        className
      )}
    >
      {children || <X className="h-4 w-4 text-[var(--coder-text-secondary)]" />}
    </button>
  )
}
DialogClose.displayName = 'DialogClose'

import ReactDOM from 'react-dom'

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
}
