import Link from 'next/link'
import { ThemeToggle } from '@/components/marketing/theme-toggle'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        backgroundColor: 'var(--coder-bg-base)',
        color: 'var(--coder-text-primary)',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Nav */}
      <nav
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          backgroundColor: 'var(--coder-nav-bg)',
          borderBottom: '1px solid var(--coder-border)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {/* Wordmark */}
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            textDecoration: 'none',
          }}
        >
          <span
            style={{
              fontSize: '20px',
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--coder-text-primary)',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            codeR
            <span
              className="animate-pulse"
              style={{
                display: 'inline-block',
                width: '8px',
                height: '16px',
                borderRadius: '2px',
                backgroundColor: 'var(--coder-accent)',
                marginLeft: '4px',
              }}
            />
          </span>
        </Link>

        {/* Nav links */}
        <div className="hidden md:flex" style={{ gap: '32px' }}>
          {[
            { href: '/features', label: 'Features' },
            { href: '/docs', label: 'Docs' },
            { href: '/changelog', label: 'Changelog' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="marketing-nav-link"
              style={{ fontSize: '15px' }}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ThemeToggle />
          <Link
            href="/signin"
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--coder-text-primary)',
              border: '1px solid var(--coder-border-mid)',
              borderRadius: '6px',
              textDecoration: 'none',
              transition: 'border-color 150ms ease',
            }}
          >
            Sign In
          </Link>
        </div>
      </nav>

      {/* Content */}
      <main style={{ flex: 1, paddingTop: '64px' }}>{children}</main>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--coder-border)',
          padding: '24px',
          textAlign: 'center',
          fontSize: '13px',
          color: 'var(--coder-text-tertiary)',
        }}
      >
        © {new Date().getFullYear()} codeR · GitHub · Privacy · Terms
      </footer>
    </div>
  )
}
