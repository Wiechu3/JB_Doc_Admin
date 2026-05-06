'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import AdminOnboardingView from '@/components/AdminOnboardingView'
import BeneficiaryOnboardingView from '@/components/BeneficiaryOnboardingView'

interface User {
  id: string
  name: string
  role: string
  isActive: boolean
  folderName: string
}

export default function OnboardingPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('currentUser')
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved))
        setLoading(false)
      } catch (e) {
        console.error('Error parsing saved user:', e)
        setLoading(false)
      }
    } else {
      fetch('/api/users')
        .then((res) => res.json())
        .then((data) => {
          const admin = data.find((u: User) => u.role === 'ADMIN')
          if (admin) {
            setCurrentUser(admin)
            localStorage.setItem('currentUser', JSON.stringify(admin))
          }
          setLoading(false)
        })
    }
  }, [])

  const handleUserChange = (user: User) => {
    setCurrentUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }

  if (loading || !currentUser) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        currentUser={currentUser}
        onUserChange={handleUserChange}
        activeTab="DOKUMENTY ONBOARDING"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentUser.role === 'ADMIN' ? (
          <AdminOnboardingView currentUser={currentUser} />
        ) : (
          <BeneficiaryOnboardingView beneficiaryId={currentUser.id} />
        )}
      </main>
    </div>
  )
}
