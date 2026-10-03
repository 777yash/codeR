'use client'

import { useEffect, useRef, type HTMLAttributes } from 'react'

export function RevealSurface({
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const host = ref.current
    if (!host) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const animations = new Set<Animation>()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          observer.unobserve(entry.target)
          if (preference.matches) return
          const animation = entry.target.animate(
            [
              { opacity: 0, transform: 'translateY(10px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 380, easing: 'cubic-bezier(.22,1,.36,1)' }
          )
          animations.add(animation)
          animation.finished.then(
            () => animations.delete(animation),
            () => animations.delete(animation)
          )
        })
      },
      { threshold: 0.08 }
    )
    host
      .querySelectorAll('[data-reveal]')
      .forEach((element) => observer.observe(element))
    const stop = () => {
      if (preference.matches)
        animations.forEach((animation) => animation.cancel())
    }
    preference.addEventListener('change', stop)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', stop)
      animations.forEach((animation) => animation.cancel())
    }
  }, [])
  return (
    <div ref={ref} {...props}>
      {children}
    </div>
  )
}
