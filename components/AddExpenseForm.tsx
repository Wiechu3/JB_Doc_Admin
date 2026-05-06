'use client'

import { useState, FormEvent, ChangeEvent } from 'react'

interface AddExpenseFormProps {
  beneficiaryId: string
  onExpenseAdded: (expense: any) => void
}

export default function AddExpenseForm({ beneficiaryId, onExpenseAdded }: AddExpenseFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    purchaseAmount: '',
    refundAmount: '',
  })

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0])
    }
  }

  const handleInputChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      if (!file) {
        setError('Plik jest wymagany')
        setLoading(false)
        return
      }

      if (!formData.name.trim()) {
        setError('Nazwa wydatku jest wymagana')
        setLoading(false)
        return
      }

      const purchaseAmount = parseFloat(formData.purchaseAmount)
      const refundAmount = parseFloat(formData.refundAmount)

      if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
        setError('Kwota zakupu musi być dodatnia')
        setLoading(false)
        return
      }

      if (isNaN(refundAmount) || refundAmount <= 0) {
        setError('Kwota do zwrotu musi być dodatnia')
        setLoading(false)
        return
      }

      const data = new FormData()
      data.append('beneficiaryId', beneficiaryId)
      data.append('name', formData.name)
      data.append('description', formData.description)
      data.append('purchaseAmount', purchaseAmount.toString())
      data.append('refundAmount', refundAmount.toString())
      data.append('file', file)

      const res = await fetch('/api/expenses', {
        method: 'POST',
        body: data,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Błąd przy dodawaniu wydatku')
      }

      const expense = await res.json()
      setSuccess('Wydatek dodany pomyślnie!')
      setFormData({ name: '', description: '', purchaseAmount: '', refundAmount: '' })
      setFile(null)
      onExpenseAdded(expense)

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd przy dodawaniu wydatku')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-orange-100 p-6 mb-8 shadow-sm">
      <h2 className="text-2xl font-bold text-orange-600 mb-6">Dodaj wydatek</h2>

      {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}
      {success && <div className="mb-4 p-4 bg-green-50 text-green-600 rounded-lg">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Plik dokumentu *
          </label>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={loading}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
          {file && <p className="text-sm text-gray-600 mt-1">Wybrano: {file.name}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nazwa wydatku *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="np. Faktura za materiały"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Opis
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="Opcjonalny opis wydatku"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kwota zakupu (PLN) *
            </label>
            <input
              type="number"
              name="purchaseAmount"
              value={formData.purchaseAmount}
              onChange={handleInputChange}
              disabled={loading}
              step="0.01"
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Kwota do zwrotu (PLN) *
            </label>
            <input
              type="number"
              name="refundAmount"
              value={formData.refundAmount}
              onChange={handleInputChange}
              disabled={loading}
              step="0.01"
              placeholder="0.00"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Zapisywanie...' : 'Zapisz wydatek'}
        </button>
      </form>
    </div>
  )
}
