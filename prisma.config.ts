import 'dotenv/config'
import { defineConfig } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // CLI + migrations use DIRECT_URL (bypasses pooler — required in Prisma 7)
    // Falls back to empty string for `prisma generate` in CI (no DB connection needed)
    url: process.env['DIRECT_URL'] ?? '',
  },
})
