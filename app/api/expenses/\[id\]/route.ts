import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateStorageFileName, MAX_FILE_SIZE } from '@/lib/utils'
import { saveFile, readFile } from '@/lib/fs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, description, purchaseAmount, refundAmount } = body

    // Validation
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Nazwa wydatku jest wymagana' }, { status: 400 })
    }

    if (purchaseAmount !== undefined && (isNaN(purchaseAmount) || purchaseAmount <= 0)) {
      return NextResponse.json({ error: 'Kwota zakupu musi być dodatnia' }, { status: 400 })
    }

    if (refundAmount !== undefined && (isNaN(refundAmount) || refundAmount <= 0)) {
      return NextResponse.json({ error: 'Kwota do zwrotu musi być dodatnia' }, { status: 400 })
    }

    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Wydatek nie znaleziony' }, { status: 404 })
    }

    const updated = await prisma.expense.update({
      where: { id: params.id },
      data: {
        name: name?.trim(),
        description: description?.trim() || null,
        purchaseAmount,
        refundAmount,
        status: 'NOWY', // Reset status when beneficiary edits
      },
      include: {
        beneficiary: true,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating expense:', error)
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action, comment, newFile } = body

    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: { beneficiary: true },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Wydatek nie znaleziony' }, { status: 404 })
    }

    if (action === 'delete') {
      const updated = await prisma.expense.update({
        where: { id: params.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      })
      return NextResponse.json(updated)
    } else if (action === 'approve') {
      const updated = await prisma.expense.update({
        where: { id: params.id },
        data: { status: 'ZAAKCEPTOWANO' },
        include: { beneficiary: true },
      })
      return NextResponse.json(updated)
    } else if (action === 'reject') {
      const updated = await prisma.expense.update({
        where: { id: params.id },
        data: { status: 'ODRZUCONO' },
        include: { beneficiary: true },
      })
      return NextResponse.json(updated)
    } else if (action === 'comment') {
      const updated = await prisma.expense.update({
        where: { id: params.id },
        data: { adminComment: comment || null },
      })
      return NextResponse.json(updated)
    } else if (action === 'updateFile') {
      if (!newFile) {
        return NextResponse.json({ error: 'Plik jest wymagany' }, { status: 400 })
      }

      const fileBuffer = Buffer.from(newFile.data, 'base64')
      
      if (fileBuffer.length > MAX_FILE_SIZE) {
        return NextResponse.json({ error: 'Plik nie może być większy niż 25 MB' }, { status: 400 })
      }

      const storedFileName = generateStorageFileName(newFile.name)
      const filePath = await saveFile(
        fileBuffer,
        expense.beneficiary.folderName,
        'wydatki',
        storedFileName
      )

      const updated = await prisma.expense.update({
        where: { id: params.id },
        data: {
          originalFileName: newFile.name,
          storedFileName,
          filePath,
          mimeType: newFile.type || 'application/octet-stream',
          fileSize: fileBuffer.length,
        },
      })
      return NextResponse.json(updated)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error processing expense action:', error)
    return NextResponse.json({ error: 'Failed to process action' }, { status: 500 })
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const searchParams = request.nextUrl.searchParams
    const action = searchParams.get('action')

    const expense = await prisma.expense.findUnique({
      where: { id: params.id },
      include: { beneficiary: true },
    })

    if (!expense) {
      return NextResponse.json({ error: 'Wydatek nie znaleziony' }, { status: 404 })
    }

    if (action === 'download') {
      try {
        const fileBuffer = await readFile(expense.filePath)
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': expense.mimeType,
            'Content-Disposition': `attachment; filename="${expense.originalFileName}"`,
          },
        })
      } catch (error) {
        return NextResponse.json({ error: 'Plik nie znaleziony' }, { status: 404 })
      }
    }

    return NextResponse.json(expense)
  } catch (error) {
    console.error('Error fetching expense:', error)
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 })
  }
}
