'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AppLogo } from '@/components/app-logo'
import { Loader2 } from 'lucide-react'
import { OAuthButtons, AUTH_INPUT_CLASS } from './auth-shared'

interface Props {
  callbackUrl: string
}

export function SignInForm({ callbackUrl }: Props) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password')
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="bg-app flex min-h-dvh items-center justify-center px-4">
      <div
        className="border-app-mid bg-app-card w-full max-w-[420px] rounded-[10px] border px-6 py-8 sm:px-10 sm:py-10"
        style={{ boxShadow: 'var(--coder-shadow-md)' }}
      >
        {/* Logo */}
        <div className="mb-8 flex justify-center">
          <AppLogo size="lg" href="/" />
        </div>

        <h1 className="text-app text-2xl font-semibold">Welcome back</h1>
        <p className="text-app-muted mt-1 mb-6 text-sm">
          Sign in to your workspace
        </p>

        <OAuthButtons callbackUrl={callbackUrl} />

        {/* Credentials form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="text-app-muted block text-sm">
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className={AUTH_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-app-muted block text-sm"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-app-accent text-xs hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className={AUTH_INPUT_CLASS}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-app-accent flex h-11 w-full items-center justify-center rounded-md text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-60"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
          </button>
        </form>

        <p className="text-app-muted mt-6 text-center text-sm">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-app-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
