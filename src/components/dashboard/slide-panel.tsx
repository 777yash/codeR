'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { X } from 'lucide-react'

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

  // Mount on open by adjusting state during render (no effect → no
  // set-state-in-effect). The close path unmounts from the gsap onComplete.
  if (open && !mounted) setMounted(true)

  useLayoutEffect(() => {
    if (!mounted) return
    const panel = panelRef.current
    const overlay = overlayRef.current
    if (!panel || !overlay) return

    tlRef.current?.kill()

    if (open) {
      const items = panel.querySelectorAll('[data-slide-item]')
      const tl = gsap.timeline()
      tl.set(overlay, { opacity: 0 })
        .set(panel, { xPercent: 100 })
        .to(overlay, { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0)
        .to(panel, { xPercent: 0, duration: 0.55, ease: 'power4.out' }, 0)
      if (items.length) {
        tl.fromTo(
          items,
          { x: 32, opacity: 0 },
          {
            x: 0,
            opacity: 1,
            duration: 0.5,
            ease: 'power3.out',
            stagger: 0.07,
          },
          0.18
        )
      }
      tlRef.current = tl
    } else {
      const tl = gsap.timeline({ onComplete: () => setMounted(false) })
      tl.to(panel, { xPercent: 100, duration: 0.32, ease: 'power3.in' }, 0).to(
        overlay,
        { opacity: 0, duration: 0.3, ease: 'power2.in' },
        0
      )
      tlRef.current = tl
    }
  }, [open, mounted])

  if (!mounted) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div
        ref={overlayRef}
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="border-app bg-app-surface relative z-10 flex h-full w-full max-w-sm flex-col overflow-hidden border-l will-change-transform"
      >
        <div className="border-app flex h-12 shrink-0 items-center justify-between border-b px-6">
          <h2 className="text-app text-sm font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)] max-md:h-9 max-md:w-9"
          >
            <X className="text-app-dim h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
