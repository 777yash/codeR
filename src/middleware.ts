import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/rooms', '/profile', '/settings']

// Routes only for unauthenticated users
const authRoutes = ['/signin', '/signup']

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const isProtectedRoute = protectedRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )
  const isAuthRoute = authRoutes.some((route) =>
    nextUrl.pathname.startsWith(route)
  )

  // Redirect logged-in users away from auth pages
  if (isLoggedIn && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  // Redirect unauthenticated users away from protected pages
  if (!isLoggedIn && isProtectedRoute) {
    const callbackUrl = encodeURIComponent(nextUrl.pathname)
    return NextResponse.redirect(
      new URL(`/signin?callbackUrl=${callbackUrl}`, nextUrl)
    )
  }

  return NextResponse.next()
})

export const config = {
  // Run middleware on all routes except static files and api/auth
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico).*)'],
}
