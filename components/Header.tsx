'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface User {
  id: string
  name: string
  role: string
  isActive: boolean
  folderName: string
}

interface HeaderProps {
  currentUser: User | null
  onUserChange: (user: User) => void
  activeTab: string
}

export function Header({ currentUser, onUserChange, activeTab }: HeaderProps) {
  const [users, setUsers] = useState<User[]>([])
  const [dropdownOpen, setDropdownOpen] = useState(false)

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => setUsers(data))
  }, [])

  const isAdmin = currentUser?.role === 'ADMIN'
  const activeUsers = users.filter((u) => u.isActive)

  const tabs = ['WYDATKI', 'DOKUMENTY ONBOARDING']
  if (isAdmin) {
    tabs.push('USTAWIENIA')
  }

  const tabPaths = {
    'WYDATKI': '/expenses',
    'DOKUMENTY ONBOARDING': '/onboarding',
    'USTAWIENIA': '/settings',
  }

  return (
    <header className="bg-white border-b border-orange-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Tabs */}
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold text-orange-600">DocHelper</h1>
            <nav className="flex gap-1">
              {tabs.map((tab) => {
                const path = tabPaths[tab as keyof typeof tabPaths]
                const isActive = activeTab === tab
                return (
                  <Link key={tab} href={path}>
                    <button
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        isActive
                          ? 'bg-orange-600 text-white'
                          : 'text-gray-700 hover:text-orange-600'
                      }`}
                    >
                      {tab}
                    </button>
                  </Link>
                )
              })}
            </nav>
          </div>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="px-4 py-2 bg-orange-50 text-orange-600 rounded-lg border border-orange-200 hover:bg-orange-100 flex items-center gap-2"
            >
              <span>Użytkownik: {currentUser?.name || 'Wybierz'}</span>
              <span>▼</span>
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2 max-h-60 overflow-y-auto">
                  {currentUser && (
                    <div className="px-4 py-2 text-xs text-gray-500 border-b">
                      Aktualny użytkownik: <strong>{currentUser.name}</strong>
                    </div>
                  )}

                  <div className="py-2">
                    {activeUsers.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          onUserChange(user)
                          setDropdownOpen(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-orange-50 ${
                          currentUser?.id === user.id
                            ? 'bg-orange-100 text-orange-600 font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        {user.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
