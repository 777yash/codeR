'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'

import {
  LayoutDashboard,
  Users,
  Clock,
  Star,
  LogOut,
  Menu,
  X,
  Search,
} from 'lucide-react'
import { RoomSearchProvider } from '@/components/dashboard/room-search-context'
import { ThemeToggle } from '@/components/marketing/theme-toggle'
import { InviteNotifications } from '@/components/notifications/invite-notifications'
import { DashboardSettingsPanel } from '@/components/dashboard/dashboard-settings-panel'
import { DashboardProfilePanel } from '@/components/dashboard/dashboard-profile-panel'
import { DashboardHelpPanel } from '@/components/dashboard/dashboard-help-panel'

interface Invitation {
  id: string
  role: string
  createdAt: string
  room: { id: string; name: string; language: string }
  inviter: { id: string; name: string | null; image: string | null }
}

interface DashboardShellProps {
  userInitials: string
  safeView: string
  title: string
  subtitle: string
  signOutAction: () => Promise<void>
  initialInvitations: Invitation[]
  children: React.ReactNode
}

const SIDEBAR_NAV = [
  { icon: LayoutDashboard, label: 'My Rooms', view: 'my-rooms' },
  { icon: Users, label: 'Shared With Me', view: 'shared' },
  { icon: Clock, label: 'Recent', view: 'recent' },
  { icon: Star, label: 'Starred', view: 'starred' },
]

const LANGUAGES = ['Python', 'JS', 'TS', 'Go', 'Rust']

function SidebarContent({
  safeView,
  signOutAction,
  onNavigate,
}: {
  safeView: string
  signOutAction: () => Promise<void>
  onNavigate?: () => void
}) {
  return (
    <>
      <div className="flex-1 overflow-y-auto p-3">
        <p className="text-app-dim mb-2 px-2 text-[11px] font-medium tracking-wider uppercase">
          Workspace
        </p>
        <nav className="space-y-0.5">
          {SIDEBAR_NAV.map(({ icon: Icon, label, view: navView }) => {
            const isActive = safeView === navView
            return (
              <Link
                key={label}
                href={`/dashboard?view=${navView}`}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={`workspace-nav-link flex w-full items-center gap-2.5 rounded-md px-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-app-card-active text-app font-medium'
                    : 'text-app-muted hover-app-row'
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="border-app my-3 h-px border-t" />

        <p className="text-app-dim mb-2 px-2 text-[11px] font-medium tracking-wider uppercase">
          Languages
        </p>
        <div className="flex flex-wrap gap-1.5 px-2">
          {LANGUAGES.map((name) => (
            <span key={name} className="workspace-language">
              {name}
            </span>
          ))}
        </div>
      </div>

      <div className="border-app space-y-0.5 border-t p-3">
        <DashboardProfilePanel />
        <DashboardSettingsPanel />
        <DashboardHelpPanel />
        <form action={signOutAction}>
          <button
            type="submit"
            className="text-app-muted hover:bg-app-card hover:text-app-accent flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </form>
      </div>
    </>
  )
}

export function DashboardShell({
  userInitials,
  safeView,
  title,
  signOutAction,
  initialInvitations,
  children,
}: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const drawerCloseRef = useRef<HTMLButtonElement>(null)
  const navigationRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!drawerOpen) return
    const trigger = navigationRef.current
    drawerCloseRef.current?.focus()
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerOpen(false)
    }
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('keydown', close)
      trigger?.focus()
    }
  }, [drawerOpen])

  return (
    <RoomSearchProvider query={searchQuery}>
      <div className="workspace-shell bg-app text-app relative flex h-dvh flex-col overflow-hidden">
        {/* Header */}
        {/* z-20: notification panel must overlay the z-10 content area below */}
        <header className="workspace-header border-app bg-app relative z-20 flex shrink-0 items-center justify-between gap-4 border-b px-4">
          <div className="flex items-center gap-2">
            {/* Hamburger — mobile only */}
            <button
              ref={navigationRef}
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)] md:hidden"
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
            >
              <Menu className="h-5 w-5 text-[var(--coder-text-secondary)]" />
            </button>
            <AppLogo size="md" href="/dashboard" />
          </div>

          {/* Search — desktop only */}
          <label className="workspace-search hidden md:flex">
            <Search size={15} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search rooms"
              placeholder="Search rooms…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setSearchQuery('')
              }}
            />
          </label>

          <div className="flex shrink-0 items-center gap-3">
            <ThemeToggle />
            <InviteNotifications initialInvitations={initialInvitations} />
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              style={{
                backgroundColor: 'var(--coder-accent-glow)',
                color: 'var(--coder-text-accent)',
                border: '1px solid var(--coder-border-accent)',
              }}
            >
              {userInitials}
            </div>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 overflow-hidden">
          {/* Sidebar — desktop static */}
          <aside className="workspace-sidebar border-app bg-app-surface hidden shrink-0 flex-col border-r md:flex">
            <SidebarContent safeView={safeView} signOutAction={signOutAction} />
          </aside>

          {/* Workspace */}
          <main className="workspace-main flex-1 overflow-y-auto">
            <div className="workspace-main-inner">
              <div className="workspace-heading">
                <h1 className="text-app font-medium">{title}</h1>
              </div>
              <input
                aria-label="Search rooms"
                placeholder="Search rooms…"
                className="workspace-mobile-search md:hidden"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
              {children}
            </div>
          </main>
        </div>

        {/* Sidebar drawer — mobile overlay. Sibling of the z-10/z-20 rows so
            its fixed z-50 wins the root stacking context (above the header) */}
        {drawerOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <aside
              role="dialog"
              aria-modal="true"
              aria-label="Navigation"
              onKeyDown={(event) => {
                if (event.key !== 'Tab') return
                const items = Array.from(
                  event.currentTarget.querySelectorAll<HTMLElement>(
                    'a[href],button:not([disabled])'
                  )
                )
                const first = items[0],
                  last = items[items.length - 1]
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault()
                  last?.focus()
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault()
                  first?.focus()
                }
              }}
              className="workspace-mobile-drawer bg-app-surface fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col md:hidden"
            >
              <div className="border-app flex h-14 shrink-0 items-center justify-between border-b px-4">
                <span className="text-app text-sm font-semibold">Menu</span>
                <button
                  ref={drawerCloseRef}
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded transition-colors hover:bg-[var(--coder-bg-card-hover)]"
                  aria-label="Close navigation"
                >
                  <X className="text-app-dim h-4 w-4" />
                </button>
              </div>
              <SidebarContent
                safeView={safeView}
                signOutAction={signOutAction}
                onNavigate={() => setDrawerOpen(false)}
              />
            </aside>
          </>
        )}
      </div>
    </RoomSearchProvider>
  )
}
