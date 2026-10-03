import Link from 'next/link'
import { auth } from '@/auth'

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const [{ error }, session] = await Promise.all([searchParams, auth()])
  const linked =
    error === 'OAuthAccountNotLinked' || error === 'AccountNotLinked'
  return (
    <div className="auth-card border-app bg-app-card mx-auto w-full max-w-md rounded-xl border p-8">
      <h1 className="text-app text-xl font-semibold">
        Unable to connect account
      </h1>
      <p className="text-app-muted mt-4 text-sm">
        {linked
          ? session?.user
            ? 'This provider account is already connected to another codeR account. Use a different provider account.'
            : 'Sign in using your existing codeR sign-in method, then connect this provider from your profile.'
          : 'The provider did not complete authentication. Return to codeR and try again.'}
      </p>
      <Link
        className="text-app-accent mt-6 inline-block text-sm font-medium"
        href={session?.user ? '/profile' : '/signin'}
      >
        {session?.user ? 'Return to profile' : 'Return to sign in'}
      </Link>
    </div>
  )
}
