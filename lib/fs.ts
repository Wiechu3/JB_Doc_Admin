import fs from 'fs/promises'
import path from 'path'

const STORAGE_BASE = path.join(process.cwd(), 'storage', 'documents')

export async function ensureStorageDirectory(folderName: string, subdirs: string[] = []) {
  const baseDir = path.join(STORAGE_BASE, folderName)
  
  try {
    await fs.mkdir(baseDir, { recursive: true })
    
    for (const subdir of subdirs) {
      await fs.mkdir(path.join(baseDir, subdir), { recursive: true })
    }
  } catch (error) {
    console.error('Error creating storage directory:', error)
    throw new Error('Failed to create storage directory')
  }
}

export function getStoragePath(folderName: string, subdirectory?: string) {
  if (subdirectory) {
    return path.join(STORAGE_BASE, folderName, subdirectory)
  }
  return path.join(STORAGE_BASE, folderName)
}

export async function saveFile(
  buffer: Buffer,
  folderName: string,
  subdirectory: string,
  fileName: string
) {
  const dirPath = getStoragePath(folderName, subdirectory)
  const filePath = path.join(dirPath, fileName)
  
  try {
    await ensureStorageDirectory(folderName, [subdirectory])
    await fs.writeFile(filePath, buffer)
    return filePath
  } catch (error) {
    console.error('Error saving file:', error)
    throw new Error('Failed to save file')
  }
}

export async function deleteFile(filePath: string) {
  try {
    await fs.unlink(filePath)
  } catch (error) {
    console.error('Error deleting file:', error)
    // Don't throw - file might already be deleted
  }
}

export async function readFile(filePath: string) {
  try {
    return await fs.readFile(filePath)
  } catch (error) {
    console.error('Error reading file:', error)
    throw new Error('File not found')
  }
}
