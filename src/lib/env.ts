import { z } from 'zod'

const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  // Auth
  NEXTAUTH_URL: z.string().url(),
  NEXTAUTH_SECRET: z.string().min(1),

  // OAuth providers
  GITHUB_CLIENT_ID: z.string().min(1),
  GITHUB_CLIENT_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_COLLAB_WS_URL: z.string().default('ws://localhost:1234'),

  // Analytics (optional — absent disables PostHog, app runs normally)
  NEXT_PUBLIC_POSTHOG_KEY: z
    .preprocess(
      (value) =>
        typeof value === 'string' ? value.trim() || undefined : value,
      z.string().min(1).optional()
    )
    .optional(),

  // Collab server internal auth
  NEXTJS_INTERNAL_SECRET: z.string().min(32),

  // Required for shared inline AI quotas and HTTP presence; these features
  // return 503 if missing. Legacy scaffolding keeps its existing fallback.
  UPSTASH_REDIS_REST_URL: z
    .preprocess(
      (value) =>
        typeof value === 'string' ? value.trim() || undefined : value,
      z.string().url().optional()
    )
    .optional(),
  UPSTASH_REDIS_REST_TOKEN: z
    .preprocess(
      (value) =>
        typeof value === 'string' ? value.trim() || undefined : value,
      z.string().min(1).optional()
    )
    .optional(),

  // AI completions
  CODESTRAL_API_KEY: z.string().min(1).optional(),

  // GroqCloud chat/scaffolding — server-only; absent returns 503.
  GROQ_API_KEY: z
    .preprocess(
      (value) =>
        typeof value === 'string' ? value.trim() || undefined : value,
      z.string().min(1).optional()
    )
    .optional(),
  // Supported strict-output models; default is GPT-OSS 120B.
  GROQ_MODEL: z
    .preprocess(
      (value) =>
        typeof value === 'string' ? value.trim() || undefined : value,
      z.enum(['openai/gpt-oss-120b', 'openai/gpt-oss-20b']).optional()
    )
    .optional(),
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(JSON.stringify(parsed.error.flatten().fieldErrors, null, 2))
  throw new Error('Invalid environment variables — check .env file')
}

export const env = parsed.data
