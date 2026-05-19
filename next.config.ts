import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
}

export default withSentryConfig(nextConfig, {
  org: 'yash-96',
  project: 'code-r',
  silent: !process.env.CI,
  widenClientFileUpload: !!process.env.CI,

  // Prevent Sentry from wrapping middleware — avoids RSC payload fetch interference
  autoInstrumentMiddleware: false,

  webpack: {
    automaticVercelMonitors: true,
    treeshake: {
      removeDebugLogging: true,
    },
  },
})
