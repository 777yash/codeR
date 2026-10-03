'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { X } from 'lucide-react'
import { createPortal } from 'react-dom'

interface SlidePanelProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
}

/**
 * Right-anchored slide-in panel animated with gsap: the panel slides in from
 * the right while its direct content blocks (marked data-slide-item) stagger
 * in. On close it animates out before unmounting. Visual styling matches the
 * app's existing panels — only the motion is gsap-driven.
 */
export function SlidePanel({
  open,
  onClose,
  title,
  children,
}: SlidePanelProps) {
  const [mounted, setMounted] = useState(open)
  const overlayRef = useRef<HTMLDivElement | null>(null)
  const panelRef = useRef<HTMLDivElement | null>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const titleId = useId()

  // Mount on open by adjusting state during render (no effect → no
  // set-state-in-effect). The close path unmounts from the gsap onComplete.
  if (open && !mounted) setMounted(true)

  useLayoutEffect(() => {
    if (!mounted) return
    const panel = panelRef.current
    const overlay = overlayRef.current
    if (!panel || !overlay) return

    tlRef.current?.kill()
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches
    const duration = (seconds: number) => (reduced ? 0 : seconds)

    if (open) {
      const items = panel.querySelectorAll('[data-slide-item]')
      const tl = gsap.timeline()
      tl.set(overlay, { opacity: 0 })
        .set(panel, { xPercent: 100 })
        .to(
          overlay,
          { opacity: 1, duration: duration(0.2), ease: 'power2.out' },
          0
        )
        .to(
          panel,
          { xPercent: 0, duration: duration(0.38), ease: 'power3.out' },
          0
        )
      if (items.length) {
        tl.fromTo(
          items,
          { x: reduced ? 0 : 10, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: duration(0.25),
            ease: 'power3.out',
            stagger: reduced ? 0 : 0.035,
          },
          reduced ? 0 : 0.1
        )
      }
      tlRef.current = tl
    } else {
      const tl = gsap.timeline({ onComplete: () => setMounted(false) })
      tl.to(
        panel,
        { xPercent: 100, duration: duration(0.24), ease: 'power2.in' },
        0
      ).to(
        overlay,
        { opacity: 0, duration: duration(0.2), ease: 'power2.in' },
        0
      )
      tlRef.current = tl
    }
    return () => {
      tlRef.current?.kill()
    }
  }, [open, mounted])

  useEffect(() => {
    if (!mounted) return
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null
    panelRef.current?.focus()
    return () => {
      if (previous?.isConnected) previous.focus()
    }
  }, [mounted])

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div
        ref={overlayRef}
        className="workspace-panel-overlay absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose()
            return
          }
          if (event.key !== 'Tab') return
          const targets = Array.from(
            event.currentTarget.querySelectorAll<HTMLElement>(
              'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex="0"]'
            )
          ).filter((element) => element.getClientRects().length > 0)
          const first = targets[0],
            last = targets[targets.length - 1]
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
        className="workspace-panel border-app bg-app-surface relative z-10 flex h-full w-full max-w-sm flex-col overflow-hidden border-l"
      >
        <div className="workspace-panel-header border-app flex h-12 shrink-0 items-center justify-between border-b px-6">
          <h2 id={titleId} className="text-app text-sm font-semibold">
            {title}
          </h2>
          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)] max-md:h-9 max-md:w-9"
          >
            <X className="text-app-dim h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>,
    document.body
  )
}
