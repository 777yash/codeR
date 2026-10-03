import { describe, expect, it, vi } from 'vitest'
import type { NextAuthConfig } from 'next-auth'
// Exercise the installed Auth.js decision logic, after provider verification,
// with the application's actual normalized providers and an in-memory adapter.
import { handleLoginOrRegister } from '../../node_modules/@auth/core/lib/actions/callback/handle-login.js'
import parseProviders from '../../node_modules/@auth/core/lib/utils/providers.js'

const { configure } = vi.hoisted(() => ({ configure: vi.fn() }))
vi.mock('next-auth', () => ({
  default: configure.mockReturnValue({
    handlers: {},
    auth: vi.fn(),
    signOut: vi.fn(),
  }),
}))
vi.mock('@auth/prisma-adapter', () => ({ PrismaAdapter: () => ({}) }))
vi.mock('@/lib/prisma', () => ({
  prisma: { account: { updateMany: vi.fn() } },
}))
import '@/auth'
import { prisma } from '@/lib/prisma'

const config = configure.mock.calls[0][0] as NextAuthConfig
const existingUser = {
  id: 'existing-user',
  email: 'victim@example.com',
  emailVerified: null,
  name: 'Existing user',
  password: 'attacker-chosen-password-hash',
}

function setup(providerId: string) {
  const { provider } = parseProviders({
    url: new URL('https://app.example/api/auth'),
    providerId,
    config,
  })
  const adapter = {
    getUserByAccount: vi.fn().mockResolvedValue(null),
    getUserByEmail: vi.fn().mockResolvedValue(existingUser),
    getUser: vi.fn().mockResolvedValue(existingUser),
    createUser: vi
      .fn()
      .mockImplementation(async (profile) => ({ ...profile, id: 'new-user' })),
    updateUser: vi.fn(),
    linkAccount: vi.fn(),
    createSession: vi.fn(),
  }
  const decode = vi.fn().mockResolvedValue({ sub: existingUser.id })
  const options = {
    provider,
    adapter,
    events: {},
    jwt: { decode },
    cookies: { sessionToken: { name: 'authjs.session-token' } },
    session: { ...config.session, generateSessionToken: () => 'session-token' },
  } as unknown as Parameters<typeof handleLoginOrRegister>[3]
  const account = {
    type: provider!.type as 'oauth' | 'oidc',
    provider: providerId,
    providerAccountId: 'verified-provider-id',
  }
  const profile = {
    id: 'provider-profile',
    email: existingUser.email,
    name: 'Verified OAuth user',
  }
  return { adapter, decode, account, options, profile }
}

describe.each(['github', 'google'])('%s account linking', (providerId) => {
  it('rejects an unauthenticated email collision with a pre-registered password account', async () => {
    const f = setup(providerId)
    await expect(
      handleLoginOrRegister('', f.profile, f.account, f.options)
    ).rejects.toMatchObject({ type: 'OAuthAccountNotLinked' })
    expect(f.adapter.linkAccount).not.toHaveBeenCalled()
    expect(f.adapter.createUser).not.toHaveBeenCalled()
    expect(f.adapter.updateUser).not.toHaveBeenCalled()
    expect(f.adapter.createSession).not.toHaveBeenCalled()
  })

  it('also rejects email-only merging with a verified existing account', async () => {
    const f = setup(providerId)
    f.adapter.getUserByEmail.mockResolvedValue({
      ...existingUser,
      emailVerified: new Date(),
    })
    await expect(
      handleLoginOrRegister('', f.profile, f.account, f.options)
    ).rejects.toMatchObject({ type: 'OAuthAccountNotLinked' })
    expect(f.adapter.linkAccount).not.toHaveBeenCalled()
  })

  it('does not treat an invalid session as permission to link accounts', async () => {
    const f = setup(providerId)
    f.decode.mockRejectedValue(new Error('Invalid JWT'))
    await expect(
      handleLoginOrRegister('invalid-token', f.profile, f.account, f.options)
    ).rejects.toMatchObject({ type: 'OAuthAccountNotLinked' })
    expect(f.adapter.linkAccount).not.toHaveBeenCalled()
  })

  it('allows a new OAuth user when there is no email conflict', async () => {
    const f = setup(providerId)
    f.adapter.getUserByEmail.mockResolvedValue(null)
    const result = await handleLoginOrRegister(
      '',
      f.profile,
      f.account,
      f.options
    )
    expect(result.user.id).toBe('new-user')
    expect(result.isNewUser).toBe(true)
    expect(f.adapter.linkAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'new-user',
        provider: providerId,
        providerAccountId: 'verified-provider-id',
      })
    )
  })

  it('allows returning OAuth users by provider identity without email-based merging', async () => {
    const f = setup(providerId)
    f.adapter.getUserByAccount.mockResolvedValue(existingUser)
    const result = await handleLoginOrRegister(
      '',
      f.profile,
      f.account,
      f.options
    )
    expect(result.user.id).toBe(existingUser.id)
    expect(f.adapter.getUserByEmail).not.toHaveBeenCalled()
    expect(f.adapter.linkAccount).not.toHaveBeenCalled()
  })

  it('permits linking only when the existing account has a valid authenticated session', async () => {
    const f = setup(providerId)
    const result = await handleLoginOrRegister(
      'valid-session',
      f.profile,
      f.account,
      f.options
    )
    expect(result.user.id).toBe(existingUser.id)
    expect(f.adapter.getUser).toHaveBeenCalledWith(existingUser.id)
    expect(f.adapter.linkAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: existingUser.id,
        provider: providerId,
        providerAccountId: 'verified-provider-id',
      })
    )
  })

  it('cannot move a provider identity already linked to someone else', async () => {
    const f = setup(providerId)
    f.adapter.getUserByAccount.mockResolvedValue({
      ...existingUser,
      id: 'other-user',
    })
    await expect(
      handleLoginOrRegister('valid-session', f.profile, f.account, f.options)
    ).rejects.toMatchObject({ type: 'OAuthAccountNotLinked' })
    expect(f.adapter.linkAccount).not.toHaveBeenCalled()
  })
})

it('refreshes GitHub gist scope only for the authenticated user and provider identity', async () => {
  await config.events!.signIn!({
    user: { id: 'owner' },
    account: {
      type: 'oauth',
      provider: 'github',
      providerAccountId: 'github-owner',
      access_token: 'new-token',
      scope: 'read:user,user:email,gist',
    },
  } as never)
  expect(prisma.account.updateMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        userId: 'owner',
        provider: 'github',
        providerAccountId: 'github-owner',
      },
      data: expect.objectContaining({
        access_token: 'new-token',
        scope: 'read:user,user:email,gist',
      }),
    })
  )
})
