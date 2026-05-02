'use client'

import * as React from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open || typeof window === 'undefined') return null
  return ReactDOM.createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange?.(false)}
      />
      {children}
    </>,
    document.body
  )
}

function DialogPortal({ children }: { children: React.ReactNode }) {
  if (typeof window === 'undefined') return null
  return ReactDOM.createPortal(children, document.body)
}

function DialogOverlay({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm',
        className
      )}
      {...props}
    />
  )
}
DialogOverlay.displayName = 'DialogOverlay'

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

function DialogContent({ children, className, ...props }: DialogContentProps) {
  return (
    <div
      className={cn(
        'fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-lg border border-white/10 bg-[#0D0D0D] p-6 shadow-xl',
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
  return (
    <h2
      className={cn('text-lg font-semibold text-[#F0F0F0]', className)}
      {...props}
    />
  )
}
DialogTitle.displayName = 'DialogTitle'

function DialogDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-sm text-[#888888]', className)} {...props} />
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
      onClick={onClose}
      className={cn(
        'absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100',
        className
      )}
    >
      {children || <X className="h-4 w-4 text-[#888888]" />}
    </button>
  )
}
DialogClose.displayName = 'DialogClose'

import ReactDOM from 'react-dom'

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
}
