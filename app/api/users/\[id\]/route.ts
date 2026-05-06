import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { name, description } = body

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json(
        { error: 'Nazwa beneficjenta jest wymagana' },
        { status: 400 }
      )
    }

    // Check if name is unique among active users (excluding current user)
    const existingUser = await prisma.user.findFirst({
      where: {
        name,
        isActive: true,
        NOT: { id: params.id },
      },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Beneficjent z tą nazwą już istnieje' },
        { status: 400 }
      )
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: {
        name,
        description: description || null,
      },
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const { action } = body

    if (action === 'deactivate') {
      const user = await prisma.user.update({
        where: { id: params.id },
        data: {
          isActive: false,
          deletedAt: new Date(),
        },
      })
      return NextResponse.json(user)
    } else if (action === 'reactivate') {
      const user = await prisma.user.update({
        where: { id: params.id },
        data: {
          isActive: true,
          deletedAt: null,
        },
      })
      return NextResponse.json(user)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error updating user status:', error)
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 })
  }
}
