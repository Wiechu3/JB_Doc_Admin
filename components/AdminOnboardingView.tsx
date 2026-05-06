'use client'

import { useState, useEffect, FormEvent, ChangeEvent } from 'react'

interface User {
  id: string
  name: string
  folderName: string
  isActive: boolean
}

interface Document {
  id: string
  title: string
  description?: string
  originalFileName: string
  fileSize: number
  createdAt: string
  beneficiaryId: string
  beneficiary: User
}

interface AdminOnboardingViewProps {
  currentUser: User
}

export default function AdminOnboardingView({ currentUser }: AdminOnboardingViewProps) {
  const [beneficiaries, setBeneficiaries] = useState<User[]>([])
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<string>('')
  const [documents, setDocuments] = useState<Document[]>([])
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({ title: '', description: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editData, setEditData] = useState({ title: '', description: '' })

  useEffect(() => {
    fetch('/api/users')
      .then((res) => res.json())
      .then((data) => {
        const benef = data.filter((u: User) => u.role === 'BENEFICIARY')
        setBeneficiaries(benef)
        if (benef.length > 0) {
          setSelectedBeneficiary(benef[0].id)
        }
      })
  }, [])

  useEffect(() => {
    if (!selectedBeneficiary) return

    fetch(`/api/onboarding?beneficiaryId=${selectedBeneficiary}`)
      .then((res) => res.json())
      .then((data) => setDocuments(data))
  }, [selectedBeneficiary])

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
      if (!selectedBeneficiary) {
        setError('Beneficjent jest wymagany')
        setLoading(false)
        return
      }

      if (!file) {
        setError('Plik jest wymagany')
        setLoading(false)
        return
      }

      if (!formData.title.trim()) {
        setError('Tytuł dokumentu jest wymagany')
        setLoading(false)
        return
      }

      const data = new FormData()
      data.append('beneficiaryId', selectedBeneficiary)
      data.append('title', formData.title)
      data.append('description', formData.description)
      data.append('file', file)

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        body: data,
      })

      if (!res.ok) {
        const errorData = await res.json()
        throw new Error(errorData.error || 'Błąd')
      }

      const document = await res.json()
      setDocuments([document, ...documents])
      setSuccess('Dokument dodany pomyślnie!')
      setFile(null)
      setFormData({ title: '', description: '' })

      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Błąd')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (id: string) => {
    window.location.href = `/api/onboarding/${id}?action=download`
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Czy na pewno chcesz usunąć ten dokument?')) return

    try {
      const res = await fetch(`/api/onboarding/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'delete' }),
      })

      if (!res.ok) throw new Error('Błąd')
      setDocuments(documents.filter((d) => d.id !== id))
    } catch (err) {
      alert('Błąd przy usuwaniu dokumentu')
    }
  }

  return (
    <div className="space-y-8">
      {/* Add Document Form */}
      <div className="bg-white rounded-lg border border-orange-100 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-orange-600 mb-6">Dodaj dokument onboardingowy</h2>

        <div className="mb-6">
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

        {error && <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg">{error}</div>}
        {success && <div className="mb-4 p-4 bg-green-50 text-green-600 rounded-lg">{success}</div>}

        {selectedBeneficiary && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plik *
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
                Tytuł *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                disabled={loading}
                placeholder="Tytuł dokumentu"
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
                placeholder="Opcjonalny opis"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Dodawanie...' : 'Dodaj dokument'}
            </button>
          </form>
        )}
      </div>

      {/* Documents List */}
      {selectedBeneficiary && (
        <div className="bg-white rounded-lg border border-orange-100 overflow-hidden shadow-sm">
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
                  Tytuł
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Opis
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Nazwa pliku
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Rozmiar
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Akcje
                </th>
              </tr>
            </thead>
            <tbody>
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Brak dokumentów dla tego beneficjenta
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="border-b border-gray-200 hover:bg-orange-50">
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {new Date(doc.createdAt).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {doc.beneficiary.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                      {doc.title}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {doc.description || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {doc.originalFileName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {(doc.fileSize / 1024).toFixed(2)} KB
                    </td>
                    <td className="px-6 py-4 text-sm space-x-2">
                      <button
                        onClick={() => handleDownload(doc.id)}
                        className="text-orange-600 hover:text-orange-700 font-medium"
                      >
                        Pobierz
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="text-red-600 hover:text-red-700 font-medium"
                      >
                        Usuń
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
