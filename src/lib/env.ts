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

  // Collab server internal auth
  NEXTJS_INTERNAL_SECRET: z.string().min(1),

  // AI completions
  CODESTRAL_API_KEY: z.string().min(1).optional(),
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
