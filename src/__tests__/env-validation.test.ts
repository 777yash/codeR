import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const optional = [
  'NEXT_PUBLIC_POSTHOG_KEY',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'GROQ_API_KEY',
  'GROQ_MODEL',
]
beforeEach(() => {
  vi.resetModules()
  for (const name of [
    'DATABASE_URL',
    'DIRECT_URL',
    'NEXTAUTH_URL',
    'NEXT_PUBLIC_APP_URL',
  ])
    vi.stubEnv(name, 'https://example.test')
  for (const name of [
    'NEXTAUTH_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
  ])
    vi.stubEnv(name, 'test-placeholder')
  vi.stubEnv(
    'NEXTJS_INTERNAL_SECRET',
    'test-placeholder-at-least-32-characters'
  )
  vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', undefined)
  vi.stubEnv('CODESTRAL_API_KEY', undefined)
  for (const name of optional) vi.stubEnv(name, undefined)
})
afterEach(() => vi.unstubAllEnvs())

describe('optional provider configuration', () => {
  it('allows the app to start when optional Redis and Groq fields are absent', async () => {
    const { env } = await import('@/lib/env')
    for (const name of optional)
      expect(env[name as keyof typeof env]).toBeUndefined()
  })
  it('normalizes blank optional settings to undefined', async () => {
    for (const name of optional) vi.stubEnv(name, '  ')
    const { env } = await import('@/lib/env')
    for (const name of optional)
      expect(env[name as keyof typeof env]).toBeUndefined()
  })
  it('still rejects an invalid configured model', async () => {
    vi.stubEnv('GROQ_MODEL', 'invalid-model')
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      await expect(import('@/lib/env')).rejects.toThrow(
        'Invalid environment variables'
      )
    } finally {
      log.mockRestore()
    }
  })
})
