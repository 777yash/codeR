import type { NextAuthConfig } from 'next-auth'
import { NextResponse } from 'next/server'

const protectedRoutes = ['/dashboard', '/rooms', '/profile', '/settings']
const authRoutes = ['/signin', '/signup']

export const authConfig = {
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/signin',
    error: '/signin',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isProtectedRoute = protectedRoutes.some((r) =>
        nextUrl.pathname.startsWith(r)
      )
      const isAuthRoute = authRoutes.some((r) => nextUrl.pathname.startsWith(r))

      if (isLoggedIn && isAuthRoute) {
        return NextResponse.redirect(new URL('/dashboard', nextUrl))
      }
      if (!isLoggedIn && isProtectedRoute) {
        const callbackUrl = encodeURIComponent(nextUrl.pathname)
        return NextResponse.redirect(
          new URL(`/signin?callbackUrl=${callbackUrl}`, nextUrl)
        )
      }
      return true
    },
    async jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    async session({ session, token }) {
      if (token && session.user) session.user.id = token.id as string
      return session
    },
  },
  providers: [],
} satisfies NextAuthConfig
