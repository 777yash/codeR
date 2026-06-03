import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const csp = [
  "default-src 'self'",
  // Monaco editor requires unsafe-eval (web workers) and unsafe-inline (theme injection)
  // cdn.jsdelivr.net required: @monaco-editor/react loads Monaco loader from jsDelivr CDN
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
  "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://avatars.githubusercontent.com",
  "font-src 'self' data:",
  "connect-src 'self' ws://localhost:* wss://*.onrender.com https://cdn.jsdelivr.net https://*.sentry.io https://*.ingest.sentry.io",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ')

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains',
  },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=()',
  },
  { key: 'Content-Security-Policy', value: csp },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
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
