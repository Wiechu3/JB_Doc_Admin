'use client'

import { useState, useEffect } from 'react'

interface Document {
  id: string
  title: string
  description?: string
  originalFileName: string
  fileSize: number
  createdAt: string
}

interface BeneficiaryOnboardingViewProps {
  beneficiaryId: string
}

export default function BeneficiaryOnboardingView({ beneficiaryId }: BeneficiaryOnboardingViewProps) {
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/onboarding?beneficiaryId=${beneficiaryId}`)
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data)
        setLoading(false)
      })
  }, [beneficiaryId])

  const handleDownload = (id: string) => {
    window.location.href = `/api/onboarding/${id}?action=download`
  }

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Ładowanie dokumentów...</div>
  }

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-lg border border-orange-100 p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-orange-600 mb-4">Dokumenty onboardingowe</h2>
        <p className="text-gray-700 mb-6">
          W tej sekcji znajdują się dokumenty przekazane przez fundusz w związku z udziałem w
          programie akceleracyjnym.
        </p>
        <p className="text-gray-700 mb-6">
          Pobierz dokumenty z listy poniżej i zapoznaj się z ich treścią. Jeżeli fundusz poprosi
          o uzupełnienie lub podpisanie dokumentu, dalsze instrukcje zostaną przekazane poza
          aplikacją albo w kolejnej wersji systemu.
        </p>
      </div>

      {documents.length === 0 ? (
        <div className="bg-white rounded-lg border border-orange-100 p-8 text-center shadow-sm">
          <p className="text-gray-500">Brak dokumentów onboardingowych do pobrania.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-orange-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-orange-100 bg-orange-50">
                <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                  Data dodania
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
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-gray-200 hover:bg-orange-50">
                  <td className="px-6 py-4 text-sm text-gray-700">
                    {new Date(doc.createdAt).toLocaleDateString('pl-PL')}
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
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleDownload(doc.id)}
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Pobierz
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
