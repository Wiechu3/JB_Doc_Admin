import { PrismaClient } from '@prisma/client'
import { ensureStorageDirectory } from '../lib/fs'

const prisma = new PrismaClient()

async function main() {
  try {
    // Check if admin already exists
    const existingAdmin = await prisma.user.findFirst({
      where: { role: 'ADMIN' },
    })

    if (!existingAdmin) {
      // Create admin
      const admin = await prisma.user.create({
        data: {
          name: 'ADMIN',
          role: 'ADMIN',
          folderName: 'admin',
          isActive: true,
        },
      })
      console.log('Admin created:', admin)
    } else {
      console.log('Admin already exists')
    }
  } catch (error) {
    console.error('Seed error:', error)
    throw error
  }
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
