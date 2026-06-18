'use client'

import { createContext, useContext } from 'react'

/** Raw search query typed into the dashboard header search bar. */
const RoomSearchContext = createContext<string>('')

export function RoomSearchProvider({
  query,
  children,
}: {
  query: string
  children: React.ReactNode
}) {
  return (
    <RoomSearchContext.Provider value={query}>
      {children}
    </RoomSearchContext.Provider>
  )
}

/** Returns the current search query ('' when rendered outside a provider). */
export function useRoomSearch() {
  return useContext(RoomSearchContext)
}
