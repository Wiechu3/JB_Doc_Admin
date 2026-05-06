import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateStorageFileName, MAX_FILE_SIZE } from '@/lib/utils'
import { saveFile } from '@/lib/fs'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const beneficiaryId = searchParams.get('beneficiaryId')

    let where: any = { isDeleted: false }

    if (beneficiaryId) {
      where.beneficiaryId = beneficiaryId
    }

    const documents = await prisma.onboardingDocument.findMany({
      where,
      include: {
        beneficiary: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const beneficiaryId = formData.get('beneficiaryId') as string
    const title = formData.get('title') as string
    const description = formData.get('description') as string
    const file = formData.get('file') as File

    // Validation
    if (!beneficiaryId) {
      return NextResponse.json({ error: 'Beneficjent jest wymagany' }, { status: 400 })
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Tytuł dokumentu jest wymagany' }, { status: 400 })
    }

    if (!file) {
      return NextResponse.json({ error: 'Plik jest wymagany' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Plik nie może być większy niż 25 MB' }, { status: 400 })
    }

    // Get beneficiary
    const beneficiary = await prisma.user.findUnique({
      where: { id: beneficiaryId },
    })

    if (!beneficiary) {
      return NextResponse.json({ error: 'Beneficjent nie znaleziony' }, { status: 404 })
    }

    // Save file
    const buffer = await file.arrayBuffer()
    const storedFileName = generateStorageFileName(file.name)
    const filePath = await saveFile(
      Buffer.from(buffer),
      beneficiary.folderName,
      'onboarding',
      storedFileName
    )

    // Create document
    const document = await prisma.onboardingDocument.create({
      data: {
        beneficiaryId,
        title: title.trim(),
        description: description?.trim() || null,
        originalFileName: file.name,
        storedFileName,
        filePath,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        uploadedByAdmin: true,
      },
      include: {
        beneficiary: true,
      },
    })

    return NextResponse.json(document, { status: 201 })
  } catch (error) {
    console.error('Error creating document:', error)
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 })
  }
}
