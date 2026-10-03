'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/docs', label: 'Docs' },
  { href: '/changelog', label: 'Changelog' },
]

export function MarketingLinks() {
  const pathname = usePathname()
  return (
    <div className="marketing-links hidden md:flex">
      {NAV_LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="marketing-nav-link"
          aria-current={pathname === href ? 'page' : undefined}
        >
          {label}
        </Link>
      ))}
    </div>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  useEffect(() => {
    if (!open) return
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [open])

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-navigation"
        style={{ color: 'var(--coder-text-primary)' }}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div id="mobile-navigation" className="mobile-marketing-nav">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              aria-current={pathname === href ? 'page' : undefined}
              onClick={() => setOpen(false)}
              style={{
                display: 'block',
                padding: '14px 24px',
                fontSize: '16px',
                color: 'var(--coder-text-primary)',
                textDecoration: 'none',
                borderBottom: '1px solid var(--coder-border)',
              }}
            >
              {label}
            </Link>
          ))}
          <Link
            href="/signin"
            onClick={() => setOpen(false)}
            style={{
              display: 'block',
              padding: '14px 24px',
              fontSize: '16px',
              color: 'var(--coder-text-primary)',
              textDecoration: 'none',
            }}
          >
            Sign In
          </Link>
        </div>
      )}
    </div>
  )
}
