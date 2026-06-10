import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'

interface SharePageProps {
  params: Promise<{ token: string }>
}

export async function generateMetadata({
  params,
}: SharePageProps): Promise<Metadata> {
  const { token } = await params
  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: { room: { select: { name: true } } },
  })

  if (!shareLink) {
    return { title: 'Invalid Link — codeR' }
  }

  return {
    title: `Join ${shareLink.room.name} — codeR`,
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const session = await auth()
  const { token } = await params

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
    include: { room: true },
  })

  if (!shareLink) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black p-4">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] p-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--coder-accent)]">
            Invalid Link
          </h1>
          <p className="text-[var(--coder-text-secondary)]">
            This share link is invalid or has expired.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[var(--coder-accent)] hover:underline"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black p-4">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] p-8 text-center">
          <h1 className="text-2xl font-semibold text-[var(--coder-accent)]">
            Link Expired
          </h1>
          <p className="text-[var(--coder-text-secondary)]">
            This share link has expired. Please ask the room owner for a new
            link.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm text-[var(--coder-accent)] hover:underline"
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black p-4">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] p-8 text-center">
          <h1 className="text-2xl font-semibold">Sign in required</h1>
          <p className="text-[var(--coder-text-secondary)]">
            You need to sign in to join this room.
          </p>
          <Link
            href={`/signin?callbackUrl=/share/${token}`}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--coder-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--coder-accent)]/90"
          >
            Sign In
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  const isAlreadyMember = await prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId: shareLink.roomId,
        userId: session.user.id!,
      },
    },
  })

  if (isAlreadyMember) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-black p-4">
        <div className="w-full max-w-md space-y-4 rounded-lg border border-[var(--coder-border-mid)] bg-[var(--coder-bg-surface)] p-8 text-center">
          <h1 className="text-2xl font-semibold">Already a member</h1>
          <p className="text-[var(--coder-text-secondary)]">
            You&apos;re already a member of this room.
          </p>
          <Link
            href={`/rooms/${shareLink.roomId}`}
            className="inline-flex items-center gap-2 rounded-md bg-[var(--coder-accent)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--coder-accent)]/90"
          >
            Open Room
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    )
  }

  await prisma.roomMember.create({
    data: {
      roomId: shareLink.roomId,
      userId: session.user.id!,
      role: shareLink.role,
    },
  })

  revalidatePath('/dashboard')
  redirect(`/rooms/${shareLink.roomId}`)
}
