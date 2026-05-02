import { auth, signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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
    <div className="flex h-screen flex-col bg-black text-[#F0F0F0]">
      {/* Top Nav */}
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-black px-4">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-0.5">
          <span className="text-lg font-bold text-white">codeR</span>
          <span className="text-[#FF2D55]">▊</span>
        </Link>

        <div className="flex shrink-0 items-center gap-3">
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
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0D0D0D]">
          <div className="flex-1 overflow-y-auto p-3">
            <p className="mb-2 px-2 text-[11px] font-medium tracking-wider text-[#555555] uppercase">
              Workspace
            </p>
            <nav className="space-y-0.5">
              {sidebarNav.map(({ icon: Icon, label, href }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm text-[#888888] transition-colors hover:bg-[#1A0A0D] hover:text-[#F0F0F0]"
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Sidebar footer */}
          <div className="space-y-0.5 border-t border-white/[0.06] p-3">
            <Link
              href="/profile"
              className="flex h-9 w-full items-center gap-2.5 rounded border-l-2 border-[#FF2D55] bg-[#2D1018] pl-[6px] text-sm text-[#F0F0F0]"
            >
              <User className="h-4 w-4" />
              Profile
            </Link>
            <button className="flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm text-[#888888] transition-colors hover:bg-[#1A0A0D] hover:text-[#F0F0F0]">
              <Settings className="h-4 w-4" />
              Settings
            </button>
            <button className="flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm text-[#888888] transition-colors hover:bg-[#1A0A0D] hover:text-[#F0F0F0]">
              <HelpCircle className="h-4 w-4" />
              Help
            </button>
            <form action={handleSignOut}>
              <button
                type="submit"
                className="flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm text-[#888888] transition-colors hover:bg-[#1A0A0D] hover:text-[#FF2D55]"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </form>
          </div>
        </aside>

        {/* Main */}
        <main className="flex-1 overflow-y-auto p-8">
          <h1 className="mb-1 text-3xl font-semibold text-[#F0F0F0]">
            Profile
          </h1>
          <p className="mb-8 text-sm text-[#888888]">
            Manage your account details
          </p>

          <div className="max-w-lg space-y-6">
            {/* Avatar + name card */}
            <div className="rounded-md border border-white/[0.06] bg-[#0D0D0D] p-6">
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
                  <p className="font-semibold text-[#F0F0F0]">
                    {user.name ?? 'No name set'}
                  </p>
                  <p className="text-sm text-[#555555]">{user.email}</p>
                </div>
              </div>

              <ProfileForm initialName={user.name} email={user.email} />
            </div>

            {/* Account info */}
            <div className="rounded-md border border-white/[0.06] bg-[#0D0D0D] p-6">
              <h2 className="mb-4 text-sm font-semibold text-[#F0F0F0]">
                Account
              </h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#555555]">Member since</span>
                  <span className="text-sm text-[#888888]">
                    {format(user.createdAt, 'MMM d, yyyy')}
                  </span>
                </div>
                <div className="h-px bg-white/[0.06]" />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#555555]">Password auth</span>
                  <span
                    className={`text-xs font-medium ${hasPassword ? 'text-emerald-500' : 'text-[#555555]'}`}
                  >
                    {hasPassword ? 'Enabled' : 'Not set'}
                  </span>
                </div>

                {providers.length > 0 && (
                  <>
                    <div className="h-px bg-white/[0.06]" />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[#555555]">
                        Linked accounts
                      </span>
                      <div className="flex gap-2">
                        {providers.includes('github') && (
                          <span className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-xs text-[#888888]">
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.2 11.38.6.11.82-.26.82-.58 0-.28-.01-1.03-.02-2.03-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.8 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02.005 2.04.14 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22 0 1.6-.01 2.9-.01 3.29 0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
                            </svg>
                            GitHub
                          </span>
                        )}
                        {providers.includes('google') && (
                          <span className="flex items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-xs text-[#888888]">
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                            >
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            Google
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
