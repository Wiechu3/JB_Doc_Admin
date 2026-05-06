'use client'

import { useState } from 'react'

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
}

interface ExpensesListProps {
  expenses: Expense[]
  beneficiaryId: string
  loading: boolean
}

export default function ExpensesList({ expenses, beneficiaryId, loading }: ExpensesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<Partial<Expense>>({})

  const handleDownload = (id: string) => {
    window.location.href = `/api/expenses/${id}?action=download`
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten wydatek?')) return

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      })

      if (!res.ok) throw new Error('Błąd przy usuwaniu')
      // Reload page or update list
      window.location.reload()
    } catch (err) {
      alert('Błąd przy usuwaniu wydatku')
    }
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

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Ładowanie wydatków...</div>
  }

  if (expenses.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        Brak wydatków do wyświetlenia.
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg border border-orange-100 overflow-hidden shadow-sm">
      <table className="w-full">
        <thead>
          <tr className="border-b border-orange-100 bg-orange-50">
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Data dodania
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Nazwa
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Opis
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
              Komentarz ADMINA
            </th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
              Akcje
            </th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense) => (
            <tr key={expense.id} className="border-b border-gray-200 hover:bg-orange-50">
              <td className="px-6 py-4 text-sm text-gray-700">
                {new Date(expense.createdAt).toLocaleDateString('pl-PL')}
              </td>
              <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                {expense.name}
              </td>
              <td className="px-6 py-4 text-sm text-gray-600">
                {expense.description || '-'}
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
                {expense.adminComment || 'Brak komentarza'}
              </td>
              <td className="px-6 py-4 text-sm space-x-2">
                <button
                  onClick={() => handleDownload(expense.id)}
                  className="text-orange-600 hover:text-orange-700 font-medium"
                >
                  Pobierz
                </button>
                <button
                  onClick={() => setEditingId(expense.id)}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Edytuj
                </button>
                <button
                  onClick={() => handleDelete(expense.id)}
                  className="text-red-600 hover:text-red-700 font-medium"
                >
                  Usuń
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
