'use client'

import { createContext, useContext, ReactNode, useState } from 'react'

interface User {
  id: string
  name: string
  role: string
  isActive: boolean
  folderName: string
}

interface UserContextType {
  currentUser: User | null
  setCurrentUser: (user: User) => void
}

const UserContext = createContext<UserContextType | undefined>(undefined)

export function UserProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser }}>
      {children}
    </UserContext.Provider>
  )
}

export function useUserContext() {
  const context = useContext(UserContext)
  if (context === undefined) {
    throw new Error('useUserContext must be used within UserProvider')
  }
  return context
}
