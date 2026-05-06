'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import AddBeneficiaryForm from '@/components/AddBeneficiaryForm'
import BeneficiariesList from '@/components/BeneficiariesList'

interface User {
  id: string
  name: string
  role: string
  description?: string
  isActive: boolean
  folderName: string
  deletedAt?: string
}

export default function SettingsPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [beneficiaries, setBeneficiaries] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem('currentUser')
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved))
      } catch (e) {
        console.error('Error parsing saved user:', e)
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
        })
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setBeneficiaries(data.filter((u: User) => u.role === 'BENEFICIARY'))
      })
  }, [])

  const handleUserChange = (user: User) => {
    setCurrentUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }

  const handleBeneficiaryAdded = (newBeneficiary: User) => {
    setBeneficiaries([...beneficiaries, newBeneficiary])
  }

  const handleBeneficiaryUpdated = (updatedBeneficiary: User) => {
    setBeneficiaries(
      beneficiaries.map((b) => (b.id === updatedBeneficiary.id ? updatedBeneficiary : b))
    )
  }

  if (loading || !currentUser) {
    return <div className="p-8 text-center">Loading...</div>
  }

  if (currentUser.role !== 'ADMIN') {
    return (
      <div className="min-h-screen bg-white">
        <Header
          currentUser={currentUser}
          onUserChange={handleUserChange}
          activeTab="USTAWIENIA"
        />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="p-8 text-center text-red-600">
            Brak dostępu do tej sekcji. Tylko ADMIN ma dostęp do ustawień.
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Header
        currentUser={currentUser}
        onUserChange={handleUserChange}
        activeTab="USTAWIENIA"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <AddBeneficiaryForm onBeneficiaryAdded={handleBeneficiaryAdded} />
        <BeneficiariesList
          beneficiaries={beneficiaries}
          onBeneficiaryUpdated={handleBeneficiaryUpdated}
        />
      </main>
    </div>
  )
}
