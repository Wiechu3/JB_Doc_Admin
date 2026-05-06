export function generateSafeFolderName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 100) // Limit length
}

export function generateStorageFileName(originalFileName: string): string {
  const timestamp = new Date().toISOString().split('T')[0]
  const randomStr = Math.random().toString(36).substring(2, 9)
  const fileExt = originalFileName.split('.').pop()
  return `${timestamp}_${randomStr}.${fileExt}`
}

export const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
