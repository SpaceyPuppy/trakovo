import fs from 'fs/promises'
import path from 'path'

function getUploadDir(): string {
  return process.env.UPLOAD_DIR?.trim()
    ? process.env.UPLOAD_DIR.trim()
    : path.join(process.cwd(), 'uploads')
}

export async function saveUpload(
  file: File,
  subdir: string,
  fieldName: string
): Promise<string> {
  const ext = path.extname(file.name).toLowerCase() || '.bin'
  const safeName = `${fieldName}_${Date.now()}${ext}`
  const uploadDir = getUploadDir()
  const dir = path.join(uploadDir, subdir)
  const filePath = path.join(dir, safeName)

  await fs.mkdir(dir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await fs.writeFile(filePath, buffer)

  return path.join(subdir, safeName).replace(/\\/g, '/')
}

export function resolveUploadPath(relativePath: string): { fullPath: string; uploadDir: string } {
  const uploadDir = getUploadDir()
  const fullPath = path.resolve(path.join(uploadDir, relativePath))
  return { fullPath, uploadDir: path.resolve(uploadDir) }
}
