import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
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

export const metadata: Metadata = {
  title: 'Dashboard — codeR',
}

async function handleSignOut() {
  'use server'
  const { signOut } = await import('@/auth')
  await signOut({ redirectTo: '/' })
}

async function getRooms(userId: string) {
  const rooms = await prisma.room.findMany({
    where: {
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    include: {
      owner: { select: { id: true, name: true, image: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, image: true } },
        },
      },
      _count: { select: { members: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })
  return rooms
}

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect('/signin')

  const user = session.user
  const initials = (user.name ?? user.email ?? 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const rooms = await getRooms(user.id!)

  const sidebarNav = [
    { icon: LayoutDashboard, label: 'My Rooms', active: true },
    { icon: Users, label: 'Shared With Me' },
    { icon: Clock, label: 'Recent' },
    { icon: Star, label: 'Starred' },
  ]

  const languages = [
    { name: 'Python', color: '#3B82F6' },
    { name: 'JS', color: '#F59E0B' },
    { name: 'TS', color: '#6366F1' },
    { name: 'Go', color: '#06B6D4' },
    { name: 'Rust', color: '#F97316' },
  ]

  return (
    <div className="flex h-screen flex-col bg-black text-[#F0F0F0]">
      <header className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-white/[0.06] bg-black px-4">
        <Link href="/dashboard" className="flex shrink-0 items-center gap-0.5">
          <span className="text-lg font-bold text-white">codeR</span>
          <span className="text-[#FF2D55]">▊</span>
        </Link>

        <div className="flex max-w-xs flex-1 items-center gap-2 rounded-md border border-white/10 bg-[#1A0A0D] px-3 py-1.5">
          <Search className="h-4 w-4 shrink-0 text-[#555555]" />
          <input
            type="text"
            placeholder="Search rooms..."
            className="min-w-0 flex-1 bg-transparent text-sm text-[#F0F0F0] outline-none placeholder:text-[#555555]"
          />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button className="text-[#888888] transition-colors hover:text-[#F0F0F0]">
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
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-white/[0.06] bg-[#0D0D0D]">
          <div className="flex-1 overflow-y-auto p-3">
            <p className="mb-2 px-2 text-[11px] font-medium tracking-wider text-[#555555] uppercase">
              Workspace
            </p>
            <nav className="space-y-0.5">
              {sidebarNav.map(({ icon: Icon, label, active }) => (
                <button
                  key={label}
                  className={`flex h-9 w-full items-center gap-2.5 rounded text-sm transition-colors ${
                    active
                      ? 'border-l-2 border-[#FF2D55] bg-[#2D1018] pl-[6px] text-[#F0F0F0]'
                      : 'px-2 text-[#888888] hover:bg-[#1A0A0D] hover:text-[#F0F0F0]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </nav>

            <div className="my-3 h-px bg-white/[0.06]" />

            <p className="mb-2 px-2 text-[11px] font-medium tracking-wider text-[#555555] uppercase">
              Languages
            </p>
            <div className="flex flex-wrap gap-1.5 px-2">
              {languages.map(({ name, color }) => (
                <span
                  key={name}
                  className="cursor-pointer rounded-full px-2 py-0.5 text-xs text-[#888888] transition-colors hover:text-[#F0F0F0]"
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

          <div className="space-y-0.5 border-t border-white/[0.06] p-3">
            <Link
              href="/profile"
              className="flex h-9 w-full items-center gap-2.5 rounded px-2 text-sm text-[#888888] transition-colors hover:bg-[#1A0A0D] hover:text-[#F0F0F0]"
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

        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-1">
            <h1 className="text-3xl font-semibold text-[#F0F0F0]">My Rooms</h1>
          </div>
          <p className="mb-6 text-sm text-[#888888]">
            Welcome back, {user.name ?? user.email}
          </p>

          <RoomList initialRooms={rooms} />
        </main>
      </div>
    </div>
  )
}
