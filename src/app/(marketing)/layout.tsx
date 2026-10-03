import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { AppLogo } from '@/components/app-logo'
import { ThemeToggle } from '@/components/marketing/theme-toggle'
import { MarketingLinks, MobileNav } from '@/components/marketing/mobile-nav'

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="marketing-shell">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>
      <header className="marketing-header">
        <nav className="page-width" aria-label="Main navigation">
          <AppLogo size="lg" href="/" />
          <MarketingLinks />
          <div className="nav-actions">
            <ThemeToggle />
            <Link
              href="/signin"
              className="action-outline hidden md:inline-flex"
            >
              Sign in <ArrowUpRight size={14} />
            </Link>
            <MobileNav />
          </div>
        </nav>
      </header>
      <main id="main-content" className="marketing-main">
        {children}
      </main>
      <footer className="marketing-footer page-width">
        <div>
          <AppLogo size="sm" href="/" />
        </div>
        <div>
          <span>© {new Date().getFullYear()} codeR</span>
          <a
            href="https://github.com/777yash/codeR"
            target="_blank"
            rel="noopener noreferrer"
          >
            Source code <ArrowUpRight size={13} />
          </a>
          <Link href="/docs">Documentation</Link>
        </div>
      </footer>
    </div>
  )
}
