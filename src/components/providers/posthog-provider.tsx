'use client'

import { useEffect } from 'react'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY

export interface PostHogUser {
  id: string
  email?: string | null
  name?: string | null
}

export function PostHogProvider({
  user,
  children,
}: {
  user: PostHogUser | null
  children: React.ReactNode
}) {
  useEffect(() => {
    if (!POSTHOG_KEY || posthog.__loaded) return
    posthog.init(POSTHOG_KEY, {
      api_host: '/ingest',
      ui_host: 'https://eu.posthog.com',
      defaults: '2025-05-24',
      disable_session_recording: true,
      person_profiles: 'identified_only',
    })
  }, [])

  if (!POSTHOG_KEY) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <PostHogIdentify user={user} />
      {children}
    </PHProvider>
  )
}

function PostHogIdentify({ user }: { user: PostHogUser | null }) {
  const posthog = usePostHog()

  useEffect(() => {
    if (!posthog) return
    if (user) {
      posthog.identify(user.id, {
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      })
    } else if (
      (posthog as unknown as { _isIdentified(): boolean })._isIdentified()
    ) {
      posthog.reset()
    }
  }, [posthog, user])

  return null
}
