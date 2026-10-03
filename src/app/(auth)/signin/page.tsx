import type { Metadata } from 'next'
import { SignInForm } from '@/components/auth/sign-in-form'

export const metadata: Metadata = {
  title: 'Sign In — codeR',
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; error?: string }>
}) {
  const { callbackUrl, error } = await searchParams
  const oauthError =
    error === 'OAuthAccountNotLinked' || error === 'AccountNotLinked'
      ? 'This sign-in method is not linked to your account. Use the method you originally registered with. If you never created an account with this email, contact the site administrator.'
      : error
        ? 'Unable to sign in. Please try again.'
        : undefined
  return (
    <SignInForm
      callbackUrl={callbackUrl ?? '/dashboard'}
      oauthError={oauthError}
    />
  )
}
