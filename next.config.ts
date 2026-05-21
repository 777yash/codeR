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

const sentryWebpackOptions = {
  org: 'yash-96',
  project: 'code-r',
  silent: !process.env.CI,
  widenClientFileUpload: !!process.env.CI,
  autoInstrumentMiddleware: false,
  webpack: {
    automaticVercelMonitors: true,
    treeshake: { removeDebugLogging: true },
  },
}

export default process.env.NODE_ENV === 'production'
  ? withSentryConfig(nextConfig, sentryWebpackOptions)
  : nextConfig
