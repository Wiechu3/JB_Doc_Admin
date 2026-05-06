'use client'

import { useState, FormEvent, ChangeEvent } from 'react'

interface AddBeneficiaryFormProps {
  onBeneficiaryAdded: (beneficiary: any) => void
}

export default function AddBeneficiaryForm({ onBeneficiaryAdded }: AddBeneficiaryFormProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

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
      if (!formData.name.trim()) {
        setError('Nazwa beneficjenta jest wymagana')
        setLoading(false)
        return
      }

      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Błąd przy dodawaniu beneficjenta')
      }

      const beneficiary = await res.json()
      setSuccess('Beneficjent dodany pomyślnie!')
      setFormData({ name: '', description: '' })
      onBeneficiaryAdded(beneficiary)

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd przy dodawaniu beneficjenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-orange-100 p-6 shadow-sm">
      <h2 className="text-2xl font-bold text-orange-600 mb-6">Dodaj beneficjenta</h2>

      {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}
      {success && <div className="mb-4 p-4 bg-green-50 text-green-600 rounded-lg">{success}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nazwa beneficjenta *
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            disabled={loading}
            placeholder="np. Jan Kowalski Sp. z o.o."
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
            placeholder="Opcjonalny opis beneficjenta"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
        >
          {loading ? 'Dodawanie...' : 'Dodaj beneficjenta'}
        </button>
      </form>
    </div>
  )
}
