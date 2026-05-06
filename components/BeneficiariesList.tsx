'use client'

import { useState } from 'react'

interface User {
  id: string
  name: string
  description?: string
  folderName: string
  isActive: boolean
  deletedAt?: string
}

interface BeneficiariesListProps {
  beneficiaries: User[]
  onBeneficiaryUpdated: (beneficiary: User) => void
}

export default function BeneficiariesList({
  beneficiaries,
  onBeneficiaryUpdated,
}: BeneficiariesListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ name: '', description: '' })
  const [loading, setLoading] = useState(false)

  const handleEdit = (beneficiary: User) => {
    setEditingId(beneficiary.id)
    setEditData({ name: beneficiary.name, description: beneficiary.description || '' })
  }

  const handleSaveEdit = async (id: string) => {
    try {
      setLoading(true)
      const res = await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })

      if (!res.ok) throw new Error('Błąd')
      const updated = await res.json()
      onBeneficiaryUpdated(updated)
      setEditingId(null)
    } catch (err) {
      alert('Błąd przy edycji beneficjenta')
    } finally {
      setLoading(false)
    }
  }

  const handleDeactivate = async (id: string) => {
    if (!confirm('Czy na pewno chcesz odebrać dostęp temu beneficjentowi?')) return

    try {
      setLoading(true)
      const res = await fetch(`/api/users/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deactivate' }),
      })

      if (!res.ok) throw new Error('Błąd')
      const updated = await res.json()
      onBeneficiaryUpdated(updated)
    } catch (err) {
      alert('Błąd przy odbieraniu dostępu')
    } finally {
      setLoading(false)
    }
  }

  const handleReactivate = async (id: string) => {
    if (!confirm('Czy na pewno chcesz przywrócić dostęp temu beneficjentowi?')) return

    try {
      setLoading(true)
      const res = await fetch(`/api/users/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reactivate' }),
      })

      if (!res.ok) throw new Error('Błąd')
      const updated = await res.json()
      onBeneficiaryUpdated(updated)
    } catch (err) {
      alert('Błąd przy przywracaniu dostępu')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-orange-100 overflow-hidden shadow-sm">
      <h2 className="px-6 py-4 text-xl font-bold text-orange-600 border-b border-orange-100">
        Lista beneficjentów
      </h2>

      {beneficiaries.length === 0 ? (
        <div className="p-8 text-center text-gray-500">Brak beneficjentów</div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-orange-100 bg-orange-50">
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Nazwa
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Opis
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Folder
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Status
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                Akcje
              </th>
            </tr>
          </thead>
          <tbody>
            {beneficiaries.map((beneficiary) => (
              <tr key={beneficiary.id} className="border-b border-gray-200 hover:bg-orange-50">
                <td className="px-6 py-4">
                  {editingId === beneficiary.id ? (
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      disabled={loading}
                      className="w-full px-2 py-1 border border-gray-300 rounded"
                    />
                  ) : (
                    <span className="text-sm font-medium text-gray-900">{beneficiary.name}</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  {editingId === beneficiary.id ? (
                    <textarea
                      value={editData.description}
                      onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                      disabled={loading}
                      rows={2}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                    />
                  ) : (
                    <span className="text-sm text-gray-600">
                      {beneficiary.description || '-'}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {beneficiary.folderName}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      beneficiary.isActive
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {beneficiary.isActive ? 'Aktywny' : 'Dostęp odebrany'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm space-x-2">
                  {editingId === beneficiary.id ? (
                    <>
                      <button
                        onClick={() => handleSaveEdit(beneficiary.id)}
                        disabled={loading}
                        className="text-green-600 hover:text-green-700 font-medium"
                      >
                        Zapisz
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        disabled={loading}
                        className="text-gray-600 hover:text-gray-700 font-medium"
                      >
                        Anuluj
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleEdit(beneficiary)}
                        disabled={loading}
                        className="text-blue-600 hover:text-blue-700 font-medium"
                      >
                        Edytuj
                      </button>
                      {beneficiary.isActive ? (
                        <button
                          onClick={() => handleDeactivate(beneficiary.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-700 font-medium"
                        >
                          Odbierz dostęp
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReactivate(beneficiary.id)}
                          disabled={loading}
                          className="text-green-600 hover:text-green-700 font-medium"
                        >
                          Przywróć dostęp
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
