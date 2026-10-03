import { expect, it, vi } from 'vitest'

vi.mock('@/components/auth/sign-in-form', () => ({ SignInForm: () => null }))
import SignInPage from '@/app/(auth)/signin/page'

it.each(['OAuthAccountNotLinked', 'AccountNotLinked'])(
  'explains %s without suggesting an unsafe account merge',
  async (error) => {
    const page = await SignInPage({
      searchParams: Promise.resolve({ error, callbackUrl: '/rooms/example' }),
    })
    expect(page.props.oauthError).toContain(
      'Use the method you originally registered with'
    )
    expect(page.props.oauthError).toContain(
      'If you never created an account with this email'
    )
    expect(page.props.callbackUrl).toBe('/rooms/example')
  }
)

it('does not echo arbitrary error query strings', async () => {
  const page = await SignInPage({
    searchParams: Promise.resolve({
      error: 'private-diagnostic-or-injected-text',
    }),
  })
  expect(page.props.oauthError).toBe('Unable to sign in. Please try again.')
})

it('has no error on an ordinary visit', async () => {
  const page = await SignInPage({ searchParams: Promise.resolve({}) })
  expect(page.props.oauthError).toBeUndefined()
})
