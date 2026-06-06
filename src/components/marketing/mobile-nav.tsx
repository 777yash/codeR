'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { href: '/features', label: 'Features' },
  { href: '/docs', label: 'Docs' },
  { href: '/changelog', label: 'Changelog' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded transition-colors hover:bg-white/5"
        aria-label={open ? 'Close menu' : 'Open menu'}
        style={{ color: 'var(--coder-text-primary)' }}
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          style={{
            position: 'fixed',
            top: '64px',
            left: 0,
            right: 0,
            zIndex: 49,
            backgroundColor: 'var(--coder-nav-bg)',
            borderBottom: '1px solid var(--coder-border)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
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
