import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateStorageFileName, MAX_FILE_SIZE } from '@/lib/utils'
import { saveFile } from '@/lib/fs'
import path from 'path'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const beneficiaryId = searchParams.get('beneficiaryId')

    let where: any = { isDeleted: false }

    if (beneficiaryId) {
      where.beneficiaryId = beneficiaryId
    }

    const expenses = await prisma.expense.findMany({
      where,
      include: {
        beneficiary: true,
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json(expenses)
  } catch (error) {
    console.error('Error fetching expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const beneficiaryId = formData.get('beneficiaryId') as string
    const name = formData.get('name') as string
    const description = formData.get('description') as string
    const purchaseAmount = parseFloat(formData.get('purchaseAmount') as string)
    const refundAmount = parseFloat(formData.get('refundAmount') as string)
    const file = formData.get('file') as File

    // Validation
    if (!beneficiaryId) {
      return NextResponse.json({ error: 'Beneficjent jest wymagany' }, { status: 400 })
    }

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nazwa wydatku jest wymagana' }, { status: 400 })
    }

    if (isNaN(purchaseAmount) || purchaseAmount <= 0) {
      return NextResponse.json({ error: 'Kwota zakupu musi być dodatnia' }, { status: 400 })
    }

    if (isNaN(refundAmount) || refundAmount <= 0) {
      return NextResponse.json({ error: 'Kwota do zwrotu musi być dodatnia' }, { status: 400 })
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
      'wydatki',
      storedFileName
    )

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        beneficiaryId,
        name: name.trim(),
        description: description?.trim() || null,
        purchaseAmount,
        refundAmount,
        originalFileName: file.name,
        storedFileName,
        filePath,
        mimeType: file.type || 'application/octet-stream',
        fileSize: file.size,
        status: 'NOWY',
      },
      include: {
        beneficiary: true,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Error creating expense:', error)
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 })
  }
}
