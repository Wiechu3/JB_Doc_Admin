'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  role: string
  isActive: boolean
  folderName: string
}

interface Expense {
  id: string
  name: string
  description?: string
  purchaseAmount: number
  refundAmount: number
  status: string
  adminComment?: string
  originalFileName: string
  createdAt: string
  beneficiaryId: string
  beneficiary: User
}

interface AdminExpensesViewProps {
  expenses: Expense[]
  currentUser: User
}

export default function AdminExpensesView({ expenses: allExpenses, currentUser }: AdminExpensesViewProps) {
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>('')
  const [beneficiaries, setBeneficiaries] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [commentingId, setCommentingId] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        setBeneficiaries(data.filter((u: User) => u.role === 'BENEFICIARY'))
        if (data.length > 0) {
          setSelectedBeneficiary(data[0].id)
        }
      })
  }, [])

  const selectedExpenses = selectedBeneficiary
    ? allExpenses.filter((e) => e.beneficiaryId === selectedBeneficiary)
    : []

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve' }),
      })

      if (!res.ok) throw new Error('Błąd')
      window.location.reload()
    } catch (err) {
      alert('Błąd przy zatwierdzeniu wydatku')
    }
  }

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })

      if (!res.ok) throw new Error('Błąd')
      window.location.reload()
    } catch (err) {
      alert('Błąd przy odrzuceniu wydatku')
    }
  }

  const handleAddComment = async (id: string) => {
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'comment', comment: commentText }),
      })

      if (!res.ok) throw new Error('Błąd')
      setCommentingId(null)
      setCommentText('')
      window.location.reload()
    } catch (err) {
      alert('Błąd przy dodawaniu komentarza')
    }
  }

  const handleDownload = (id: string) => {
    window.location.href = `/api/expenses/${id}?action=download`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NOWY':
        return 'bg-gray-100 text-gray-800'
      case 'ZAAKCEPTOWANO':
        return 'bg-green-100 text-green-800'
      case 'ODRZUCONO':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div>
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Wybierz beneficjenta
        </label>
        <select
          value={selectedBeneficiary}
          onChange={(e) => setSelectedBeneficiary(e.target.value)}
          className="w-full md:w-1/3 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
        >
          <option value="">-- Wybierz beneficjenta --</option>
          {beneficiaries.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {!b.isActive && '(Dostęp odebrany)'}
            </option>
          ))}
        </select>
      </div>

      {selectedBeneficiary ? (
        <div className="bg-white rounded-lg border border-orange-100 overflow-hidden shadow-sm">
          {selectedExpenses.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              Brak wydatków dla tego beneficjenta.
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-orange-100 bg-orange-50">
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Data
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Beneficjent
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Nazwa
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Kwota zakupu
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Kwota do zwrotu
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Komentarz
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Akcje
                  </th>
                </tr>
              </thead>
              <tbody>
                {selectedExpenses.map((expense) => (
                  <tr key={expense.id} className="border-b border-gray-200 hover:bg-orange-50">
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(expense.createdAt).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {expense.beneficiary.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {expense.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {expense.purchaseAmount.toFixed(2)} PLN
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {expense.refundAmount.toFixed(2)} PLN
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(expense.status)}`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {commentingId === expense.id ? (
                        <div className="space-y-2">
                          <textarea
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            placeholder="Wpisz komentarz..."
                            className="w-full px-2 py-1 border border-gray-300 rounded text-xs"
                            rows={2}
                          />
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAddComment(expense.id)}
                              className="px-2 py-1 bg-orange-600 text-white text-xs rounded hover:bg-orange-700"
                            >
                              Zapisz
                            </button>
                            <button
                              onClick={() => setCommentingId(null)}
                              className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded"
                            >
                              Anuluj
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <p>{expense.adminComment || 'Brak'}</p>
                          <button
                            onClick={() => {
                              setCommentingId(expense.id)
                              setCommentText(expense.adminComment || '')
                            }}
                            className="text-xs text-blue-600 hover:text-blue-700 mt-1"
                          >
                            {expense.adminComment ? 'Edytuj' : 'Dodaj'}
                          </button>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm space-x-1">
                      <button
                        onClick={() => handleDownload(expense.id)}
                        className="text-orange-600 hover:text-orange-700 font-medium text-xs"
                      >
                        Pobierz
                      </button>
                      {expense.status !== 'ZAAKCEPTOWANO' && (
                        <button
                          onClick={() => handleApprove(expense.id)}
                          className="text-green-600 hover:text-green-700 font-medium text-xs"
                        >
                          Zatwierdź
                        </button>
                      )}
                      {expense.status !== 'ODRZUCONO' && (
                        <button
                          onClick={() => handleReject(expense.id)}
                          className="text-red-600 hover:text-red-700 font-medium text-xs"
                        >
                          Odrzuć
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="p-8 text-center text-gray-500">
          Wybierz beneficjenta, aby zobaczyć jego wydatki.
        </div>
      )}
    </div>
  )
}
