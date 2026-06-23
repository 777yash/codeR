'use client'

import { useLayoutEffect, useRef } from 'react'
import { gsap } from 'gsap'
import { cn } from '@/lib/utils'

/**
 * A single shimmer placeholder block. The sheen is a child element animated by
 * the enclosing {@link SkeletonGroup}; on its own a Skeleton renders as a static
 * surface (correct fallback when no group / reduced motion).
 */
export function Skeleton({
  className,
  style,
}: {
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      data-skeleton
      style={style}
      className={cn(
        'skeleton-base relative overflow-hidden rounded-md',
        className
      )}
    >
      <span aria-hidden className="skeleton-sheen" />
    </div>
  )
}

interface SkeletonGroupProps {
  className?: string
  children: React.ReactNode
}

/**
 * Wraps a tree of {@link Skeleton} blocks and drives two gsap animations scoped
 * to this subtree: a staggered fade-rise entrance and a looping sheen wave that
 * sweeps across every block. Honors prefers-reduced-motion (no animation, blocks
 * stay visible). Cleanup via gsap.context().revert() on unmount.
 */
export function SkeletonGroup({ className, children }: SkeletonGroupProps) {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const ctx = gsap.context(() => {
      gsap.from('[data-skeleton]', {
        autoAlpha: 0,
        y: 14,
        duration: 0.5,
        ease: 'power3.out',
        stagger: 0.05,
      })
      gsap.fromTo(
        '.skeleton-sheen',
        { xPercent: -100 },
        {
          xPercent: 200,
          duration: 1.4,
          ease: 'power1.inOut',
          repeat: -1,
          stagger: 0.12,
        }
      )
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={rootRef}
      className={className}
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      {children}
    </div>
  )
}
