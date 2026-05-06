import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readFile } from '@/lib/fs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { title, description } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Tytuł dokumentu jest wymagany' }, { status: 400 })
    }

    const document = await prisma.onboardingDocument.update({
      where: { id: params.id },
      data: {
        title: title.trim(),
        description: description?.trim() || null,
      },
      include: {
        beneficiary: true,
      },
    })

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action } = body

    const document = await prisma.onboardingDocument.findUnique({
      where: { id: params.id },
    })

    if (!document) {
      return NextResponse.json({ error: 'Dokument nie znaleziony' }, { status: 404 })
    }

    if (action === 'delete') {
      const updated = await prisma.onboardingDocument.update({
        where: { id: params.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
        },
      })
      return NextResponse.json(updated)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error processing document action:', error)
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

    const document = await prisma.onboardingDocument.findUnique({
      where: { id: params.id },
      include: { beneficiary: true },
    })

    if (!document) {
      return NextResponse.json({ error: 'Dokument nie znaleziony' }, { status: 404 })
    }

    if (action === 'download') {
      try {
        const fileBuffer = await readFile(document.filePath)
        return new NextResponse(fileBuffer, {
          headers: {
            'Content-Type': document.mimeType,
            'Content-Disposition': `attachment; filename="${document.originalFileName}"`,
          },
        })
      } catch (error) {
        return NextResponse.json({ error: 'Plik nie znaleziony' }, { status: 404 })
      }
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Failed to fetch document' }, { status: 500 })
  }
}
