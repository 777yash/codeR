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

export function SignUpForm({ callbackUrl }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'Registration failed')
      setLoading(false)
      return
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      router.push('/signin')
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

        <h1 className="text-app text-2xl font-semibold">Create an account</h1>
        <p className="text-app-muted mt-1 mb-6 text-sm">
          Start collaborating in minutes
        </p>

        <OAuthButtons callbackUrl={callbackUrl} />

        {/* Registration form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="name" className="text-app-muted block text-sm">
              Full name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={2}
              placeholder="Alice Johnson"
              className={AUTH_INPUT_CLASS}
            />
          </div>

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
            <label htmlFor="password" className="text-app-muted block text-sm">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="Min. 8 characters"
              className={AUTH_INPUT_CLASS}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="bg-app-accent flex h-11 w-full items-center justify-center rounded-md text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        <p className="text-app-muted mt-6 text-center text-sm">
          Already have an account?{' '}
          <Link href="/signin" className="text-app-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
