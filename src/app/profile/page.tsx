import { auth, signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import {
  LayoutDashboard,
  Users,
  Clock,
  Star,
  Settings,
  HelpCircle,
  LogOut,
  User,
} from 'lucide-react'
import { ProfileForm } from '@/components/profile/profile-form'
import { ConnectedAccounts } from '@/components/profile/connected-accounts'
import { ThemeToggle } from '@/components/marketing/theme-toggle'
import type { Metadata } from 'next'
import { format } from 'date-fns'

export const metadata: Metadata = {
  title: 'Profile — codeR',
}

async function handleSignOut() {
  'use server'
  await signOut({ redirectTo: '/' })
}

export default async function ProfilePage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/signin')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      createdAt: true,
      password: true,
      accounts: { select: { provider: true } },
    },
  })

  if (!user) redirect('/signin')

  const initials = (user.name ?? user.email ?? 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const sidebarNav = [
    { icon: LayoutDashboard, label: 'My Rooms', href: '/dashboard' },
    { icon: Users, label: 'Shared With Me', href: '/dashboard' },
    { icon: Clock, label: 'Recent', href: '/dashboard' },
    { icon: Star, label: 'Starred', href: '/dashboard' },
  ]

  const providers = user.accounts.map((a) => a.provider)
  const hasPassword = !!user.password

  return (
    <div className="bg-app text-app flex h-dvh flex-col">
      {/* Top Nav */}
      <header className="border-app bg-app flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
        <AppLogo size="md" href="/dashboard" />

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
            style={{
              backgroundColor: 'rgba(255,45,85,0.15)',
              color: '#FF2D55',
            }}
          >
            {initials}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="border-app bg-app-surface hidden w-[220px] shrink-0 flex-col border-r md:flex">
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-app-dim mb-2 px-2 text-[11px] font-medium tracking-wider uppercase">
              Workspace
            </p>
            <nav className="space-y-0.5">
              {sidebarNav.map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="text-app-muted hover-app-row flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm transition-colors"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Sidebar footer */}
          <div className="border-app space-y-0.5 border-t p-3">
            <Link
              href="/profile"
              className="border-app-accent bg-app-card-hover text-app flex h-9 w-full items-center gap-2.5 rounded border-l-2 pl-[6px] text-sm"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <button className="text-app-muted hover-app-row flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm transition-colors">
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button className="text-app-muted hover-app-row flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm transition-colors">
              <HelpCircle className="h-4 w-4" />
              Help
            </button>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="text-app-muted hover:bg-app-card hover:text-app-accent flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </form>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <h1 className="text-app mb-1 text-3xl font-semibold">Profile</h1>
          <p className="text-app-muted mb-8 text-sm">
            Manage your account details
          </p>

          <div className="max-w-lg space-y-6">
            {/* Avatar + name card */}
            <div className="border-app bg-app-surface rounded-md border p-6">
              <div className="mb-6 flex items-center gap-4">
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold"
                  style={{
                    backgroundColor: 'rgba(255,45,85,0.15)',
                    color: '#FF2D55',
                  }}
                >
                  {initials}
                </div>
                <div>
                  <p className="text-app font-semibold">
                    {user.name ?? 'No name set'}
                  </p>
                  <p className="text-app-dim text-sm">{user.email}</p>
                </div>
              </div>

              <ProfileForm initialName={user.name} email={user.email} />
            </div>

            {/* Account info */}
            <div className="border-app bg-app-surface rounded-md border p-6">
              <h2 className="text-app mb-4 text-sm font-semibold">Account</h2>
              <div className="flex items-center justify-between">
                <span className="text-app-dim text-xs">Member since</span>
                <span className="text-app-muted text-sm">
                  {format(user.createdAt, 'MMM d, yyyy')}
                </span>
              </div>
            </div>

            {/* Sign-in methods — connect providers + set password */}
            <ConnectedAccounts
              providers={providers}
              hasPassword={hasPassword}
              callbackUrl="/profile"
            />
          </div>
        </main>
      </div>
    </div>
  )
}
