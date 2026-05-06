'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/Header'
import { useUserContext } from '@/app/context/UserContext'
import ExpensesList from '@/components/ExpensesList'
import AddExpenseForm from '@/components/AddExpenseForm'
import AdminExpensesView from '@/components/AdminExpensesView'

interface User {
  id: string
  name: string
  role: string
  isActive: boolean
  folderName: string
}

export default function ExpensesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [expenses, setExpenses] = useState([])
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
      // Set to admin by default
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
  }, [])

  useEffect(() => {
    if (!currentUser) return

    setLoading(true)
    const url =
      currentUser.role === 'ADMIN'
        ? '/api/expenses'
        : `/api/expenses?beneficiaryId=${currentUser.id}`

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setExpenses(data)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Error fetching expenses:', err)
        setLoading(false)
      })
  }, [currentUser])

  const handleUserChange = (user: User) => {
    setCurrentUser(user)
    localStorage.setItem('currentUser', JSON.stringify(user))
  }

  const handleExpenseAdded = (newExpense: any) => {
    setExpenses([newExpense, ...expenses])
  }

  if (!currentUser) {
    return <div className="p-8 text-center">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-white">
      <Header currentUser={currentUser} onUserChange={handleUserChange} activeTab="WYDATKI" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentUser.role === 'ADMIN' ? (
          <AdminExpensesView expenses={expenses} currentUser={currentUser} />
        ) : (
          <div>
            <AddExpenseForm beneficiaryId={currentUser.id} onExpenseAdded={handleExpenseAdded} />
            <ExpensesList expenses={expenses} beneficiaryId={currentUser.id} loading={loading} />
          </div>
        )}
      </main>
    </div>
  )
}
