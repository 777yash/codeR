import { auth, signOut } from '@/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'
import { ProfileForm } from '@/components/profile/profile-form'
import { ConnectedAccounts } from '@/components/profile/connected-accounts'
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

  const providers = user.accounts.map((a) => a.provider)
  const hasPassword = !!user.password

  return (
    <DashboardShell
      userInitials={initials}
      safeView="profile"
      title="Profile"
      subtitle=""
      signOutAction={handleSignOut}
      initialInvitations={[]}
    >
      <div className="profile-grid">
        <section className="profile-card">
          <div className="profile-identity">
            <span>{initials}</span>
            <div>
              <h2>{user.name ?? 'Your account'}</h2>
              <p>{user.email}</p>
            </div>
          </div>
          <ProfileForm initialName={user.name} email={user.email} />
        </section>
        <div className="profile-account">
          <section className="profile-card">
            <h2>Account</h2>
            <div className="profile-member">
              <span>Member since</span>
              <time>{format(user.createdAt, 'MMM d, yyyy')}</time>
            </div>
          </section>
          <ConnectedAccounts
            providers={providers}
            hasPassword={hasPassword}
            callbackUrl="/profile"
          />
        </div>
      </div>
    </DashboardShell>
  )
}
