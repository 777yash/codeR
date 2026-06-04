import { NextResponse } from 'next/server'

/**
 * Returns a 403 NextResponse if the request Origin header does not match
 * NEXT_PUBLIC_APP_URL. Returns null when the request is allowed through.
 *
 * Call at the top of any state-changing API route handler (POST/PATCH/PUT/DELETE).
 * Internal routes that set x-internal-secret bypass this check automatically.
 */
export function verifyCsrfOrigin(req: Request): NextResponse | null {
  if (req.headers.has('x-internal-secret')) return null

  const origin = req.headers.get('origin')
  if (!origin) return null

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  try {
    if (origin !== new URL(appUrl).origin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
  } catch {
    // malformed NEXT_PUBLIC_APP_URL — fail open
  }
  return null
}
