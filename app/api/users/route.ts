import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateSafeFolderName } from '@/lib/utils'
import { ensureStorageDirectory } from '@/lib/fs'

export async function GET() {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description } = body

    // Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Nazwa beneficjenta jest wymagana' },
        { status: 400 }
      )
    }

    const folderName = generateSafeFolderName(name)

    // Check if name is unique among active users
    const existingUser = await prisma.user.findFirst({
      where: {
        name,
        isActive: true,
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Beneficjent z tą nazwą już istnieje' },
        { status: 400 }
      )
    }

    // Check if folder name is unique
    const existingFolder = await prisma.user.findFirst({
      where: { folderName },
    })

    if (existingFolder) {
      return NextResponse.json(
        { error: 'Folder o tej nazwie już istnieje' },
        { status: 400 }
      )
    }

    // Create storage directories
    await ensureStorageDirectory(folderName, ['wydatki', 'onboarding'])

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        description: description || null,
        folderName,
        role: 'BENEFICIARY',
      },
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Error creating user:', error)
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 })
  }
}
