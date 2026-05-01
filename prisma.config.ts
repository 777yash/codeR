import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // CLI + migrations use DIRECT_URL (bypasses pooler — required in Prisma 7)
    url: env('DIRECT_URL'),
  },
})
