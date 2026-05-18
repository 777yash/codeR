import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { prisma } from '@/lib/prisma'
import {
  LayoutDashboard,
  Users,
  Clock,
  Star,
  Settings,
  HelpCircle,
  Search,
  Bell,
  LogOut,
  User,
} from 'lucide-react'
import type { Metadata } from 'next'
import { RoomList } from '@/components/rooms/room-list'
import { CollabWarmup } from '@/components/collab-warmup'
import { ThemeToggle } from '@/components/marketing/theme-toggle'

export const metadata: Metadata = {
  title: 'Dashboard — codeR',
}

async function handleSignOut() {
  'use server'
  const { signOut } = await import('@/auth')
  await signOut({ redirectTo: '/' })
}

const include = {
  owner: { select: { id: true, name: true, image: true } },
  members: {
    include: { user: { select: { id: true, name: true, image: true } } },
  },
  _count: { select: { members: true } },
} as const

async function getRooms(userId: string, view: string) {
  const orderBy = { updatedAt: 'desc' as const }
  switch (view) {
    case 'shared':
      return prisma.room.findMany({
        where: { members: { some: { userId } }, ownerId: { not: userId } },
        include,
        orderBy,
      })
    case 'recent':
      return prisma.room.findMany({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
        include,
        orderBy,
        take: 10,
      })
    case 'starred':
      return prisma.room.findMany({
        where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
        include,
        orderBy,
      })
    default:
      return prisma.room.findMany({
        where: { ownerId: userId },
        include,
        orderBy,
      })
  }
}

const viewMeta: Record<string, { title: string; subtitle: string }> = {
  'my-rooms': { title: 'My Rooms', subtitle: 'Rooms you own' },
  shared: { title: 'Shared With Me', subtitle: 'Rooms others invited you to' },
  recent: { title: 'Recent', subtitle: 'Last 10 rooms you accessed' },
  starred: { title: 'Starred', subtitle: 'Rooms you starred' },
}

const languages = [
  { name: 'Python', color: '#3B82F6' },
  { name: 'JS', color: '#F59E0B' },
  { name: 'TS', color: '#6366F1' },
  { name: 'Go', color: '#06B6D4' },
  { name: 'Rust', color: '#F97316' },
]

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>
}) {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  const { view = 'my-rooms' } = await searchParams
  const safeView = ['my-rooms', 'shared', 'recent', 'starred'].includes(view)
    ? view
    : 'my-rooms'

  const user = session.user
  const initials = (user.name ?? user.email ?? 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const rooms = await getRooms(user.id!, safeView)
  const { title, subtitle } = viewMeta[safeView]

  const sidebarNav = [
    { icon: LayoutDashboard, label: 'My Rooms', view: 'my-rooms' },
    { icon: Users, label: 'Shared With Me', view: 'shared' },
    { icon: Clock, label: 'Recent', view: 'recent' },
    { icon: Star, label: 'Starred', view: 'starred' },
  ]

  return (
    <div className="bg-app text-app flex h-screen flex-col">
      <CollabWarmup />

      {/* Header */}
      <header className="border-app bg-app flex h-14 shrink-0 items-center justify-between gap-4 border-b px-4">
        <AppLogo size="md" href="/dashboard" />

        <div className="border-app-mid bg-app-card flex max-w-xs flex-1 items-center gap-2 rounded-md border px-3 py-1.5">
          <Search className="text-app-dim h-4 w-4 shrink-0" />
          <input
            type="text"
            placeholder="Search rooms..."
            className="text-app placeholder:text-app-dim min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <ThemeToggle />
          <button className="text-app-muted hover-app-text transition-colors">
            <Bell className="h-5 w-5" />
          </button>
          <Link
            href="/profile"
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              backgroundColor: 'rgba(255,45,85,0.15)',
              color: '#FF2D55',
            }}
          >
            {initials}
          </Link>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="border-app bg-app-surface flex w-[220px] shrink-0 flex-col border-r">
          <div className="flex-1 overflow-y-auto p-3">
            <p className="text-app-dim mb-2 px-2 text-[11px] font-medium tracking-wider uppercase">
              Workspace
            </p>
            <nav className="space-y-0.5">
              {sidebarNav.map(({ icon: Icon, label, view: navView }) => {
                const isActive = safeView === navView
                return (
                  <Link
                    key={label}
                    href={`/dashboard?view=${navView}`}
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
              {languages.map(({ name, color }) => (
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
            <Link
              href="/profile"
              className="text-app-muted hover-app-row flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm transition-colors"
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
        <main className="bg-app flex-1 overflow-y-auto p-8">
          <h1 className="text-app mb-1 text-3xl font-semibold">{title}</h1>
          <p className="text-app-muted mb-6 text-sm">{subtitle}</p>
          <RoomList initialRooms={rooms} view={safeView} />
        </main>
      </div>
    </div>
  )
}
