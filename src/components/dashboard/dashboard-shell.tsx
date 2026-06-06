'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import {
  LayoutDashboard,
  Users,
  Clock,
  Star,
  HelpCircle,
  Search,
  LogOut,
  Menu,
  X,
} from 'lucide-react'
import { ThemeToggle } from '@/components/marketing/theme-toggle'
import { InviteNotifications } from '@/components/notifications/invite-notifications'
import { DashboardSettingsPanel } from '@/components/dashboard/dashboard-settings-panel'
import { DashboardProfilePanel } from '@/components/dashboard/dashboard-profile-panel'

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

const LANGUAGES = [
  { name: 'Python', color: '#3B82F6' },
  { name: 'JS', color: '#F59E0B' },
  { name: 'TS', color: '#6366F1' },
  { name: 'Go', color: '#06B6D4' },
  { name: 'Rust', color: '#F97316' },
]

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
                className={`flex h-9 w-full items-center gap-2.5 rounded text-sm transition-colors ${
                  isActive
                    ? 'border-app-accent bg-app-card-hover text-app border-l-2 pl-[6px]'
                    : 'text-app-muted hover-app-row px-2'
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
          {LANGUAGES.map(({ name, color }) => (
            <span
              key={name}
              className="text-app-muted hover-app-text cursor-pointer rounded-full px-2 py-0.5 text-xs transition-colors"
              style={{
                backgroundColor: `${color}20`,
                border: `1px solid ${color}40`,
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>

      <div className="border-app space-y-0.5 border-t p-3">
        <DashboardProfilePanel />
        <DashboardSettingsPanel />
        <button className="text-app-muted hover-app-row flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm transition-colors">
          <HelpCircle className="h-4 w-4" />
          Help
        </button>
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
  subtitle,
  signOutAction,
  initialInvitations,
  children,
}: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="bg-app text-app flex h-dvh flex-col">
      {/* Header */}
      <header className="border-app bg-app flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
        <div className="flex items-center gap-2">
          {/* Hamburger — mobile only */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded transition-colors hover:bg-white/5 md:hidden"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5 text-[#888888]" />
          </button>
          <AppLogo size="md" href="/dashboard" />
        </div>

        {/* Search — desktop only */}
        <div className="border-app-mid bg-app-card hidden max-w-xs flex-1 items-center gap-2 rounded-md border px-3 py-1.5 md:flex">
          <Search className="text-app-dim h-4 w-4 shrink-0" />
          <input
            type="text"
            placeholder="Search rooms..."
            className="text-app placeholder:text-app-dim min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <InviteNotifications initialInvitations={initialInvitations} />
          <div
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
            style={{
              backgroundColor: 'rgba(255,45,85,0.15)',
              color: '#FF2D55',
            }}
          >
            {userInitials}
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop static */}
        <aside className="border-app bg-app-surface hidden w-[220px] shrink-0 flex-col border-r md:flex">
          <SidebarContent safeView={safeView} signOutAction={signOutAction} />
        </aside>

        {/* Sidebar drawer — mobile overlay */}
        {drawerOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/60 md:hidden"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="bg-app-surface fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col md:hidden">
              <div className="border-app flex h-14 shrink-0 items-center justify-between border-b px-4">
                <span className="text-app text-sm font-semibold">Menu</span>
                <button
                  onClick={() => setDrawerOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded transition-colors hover:bg-white/5"
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

        {/* Main */}
        <main className="bg-app flex-1 overflow-y-auto p-4 md:p-8">
          <h1 className="text-app mb-1 text-3xl font-semibold">{title}</h1>
          <p className="text-app-muted mb-6 text-sm">{subtitle}</p>
          {children}
        </main>
      </div>
    </div>
  )
}
