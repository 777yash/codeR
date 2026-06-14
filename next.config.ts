import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const baseCspDirectives = [
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
]

const csp = baseCspDirectives.join('; ')

// WebContainer boots a hidden cross-origin iframe from StackBlitz infrastructure.
// The headless boot page is framed from https://stackblitz.com itself (confirmed
// via CSP violation on first boot); previews/workers come from the other origins.
const webContainerOrigins =
  'https://*.webcontainer-api.io https://*.staticblitz.com'

const roomCsp = baseCspDirectives
  .map((directive) =>
    directive.startsWith('connect-src')
      ? `${directive} ${webContainerOrigins} wss://*.webcontainer-api.io`
      : directive
  )
  .concat(`frame-src ${webContainerOrigins} https://stackblitz.com`)
  .join('; ')

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

// WebContainer requires SharedArrayBuffer → cross-origin isolation via COOP/COEP.
// Scoped to /rooms only — COEP require-corp blocks cross-origin subresources
// lacking CORP headers, too risky to apply site-wide.
const roomHeaders = [
  ...securityHeaders.filter((h) => h.key !== 'Content-Security-Policy'),
  { key: 'Content-Security-Policy', value: roomCsp },
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
]

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
    ],
  },
  // Reverse-proxy PostHog through same origin so analytics stays under
  // connect-src/script-src 'self' (no CSP edits) and survives ad-blockers.
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/ingest/static/:path*',
        destination: 'https://eu-assets.i.posthog.com/static/:path*',
      },
      {
        source: '/ingest/:path*',
        destination: 'https://eu.i.posthog.com/:path*',
      },
    ]
  },
  async headers() {
    // Browsers enforce the intersection of ALL CSP headers on a response, so
    // the room CSP can't relax the global one — the matchers must be disjoint.
    return [
      { source: '/((?!rooms).*)', headers: securityHeaders },
      { source: '/rooms/:path*', headers: roomHeaders },
    ]
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
