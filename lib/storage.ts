import fs from 'fs'
import path from 'path'

function getUploadBaseDirectory(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return '/tmp/storage/uploads'
  }
  const custom = process.env.UPLOAD_DIR
  if (custom && !custom.startsWith('./storage')) {
    return path.resolve(custom)
  }
  return path.join(process.cwd(), 'storage', 'uploads')
}

export const UPLOAD_DIR = getUploadBaseDirectory()

export interface StorageObject {
  path: string
  size: number
}

export async function ensureDir(dir: string) {
  try {
    await fs.promises.mkdir(dir, { recursive: true })
  } catch (err: any) {
    if (err.code !== 'EEXIST') {
      console.warn(`ensureDir warning for ${dir}:`, err.message)
    }
  }
}

export function getStoragePath(transferId: string, fileId: string, filename: string): string {
  // Sanitize filename to prevent any path traversal attempt
  const safeFilename = path.basename(filename).replace(/[/\\?%*:|"<>]/g, '_')
  const ext = path.extname(safeFilename)
  const safeTransferId = path.basename(transferId)
  const safeFileId = path.basename(fileId)
  return path.join(UPLOAD_DIR, 'files', safeTransferId, `${safeFileId}${ext}`)
}


/**
 * Directly writes a chunk into the target file at the specified byte offset.
 * This avoids storing thousands of small chunk files on disk and eliminates
 * slow assembly bottlenecks during completion of multi-GB files.
 */
export async function writeChunkDirect(
  storagePath: string,
  chunkIndex: number,
  chunkSize: number,
  data: Buffer
): Promise<void> {
  const dir = path.dirname(storagePath)
  await ensureDir(dir)

  const offset = chunkIndex * chunkSize

  // Ensure destination file exists atomically without truncating
  if (!fs.existsSync(storagePath)) {
    try {
      await fs.promises.writeFile(storagePath, Buffer.alloc(0), { flag: 'wx' })
    } catch (e: any) {
      if (e.code !== 'EEXIST') throw e
    }
  }

  // Open with 'r+' for true random-access positional byte writes
  let attempts = 0
  const maxAttempts = 4

  while (attempts < maxAttempts) {
    let fileHandle: fs.promises.FileHandle | null = null
    try {
      fileHandle = await fs.promises.open(storagePath, 'r+')
      await fileHandle.write(data, 0, data.length, offset)
      return
    } catch (err: any) {
      attempts++
      if (attempts >= maxAttempts) throw err
      await new Promise(r => setTimeout(r, attempts * 50))
    } finally {
      if (fileHandle) {
        await fileHandle.close().catch(() => {})
      }
    }
  }
}

/**
 * Fallback chunk saver for chunk-directory strategy if needed
 */
export async function saveChunk(
  transferId: string,
  fileId: string,
  chunkIndex: number,
  data: Buffer
): Promise<void> {
  const dir = path.join(UPLOAD_DIR, 'chunks', transferId, fileId)
  await ensureDir(dir)
  await fs.promises.writeFile(path.join(dir, `chunk_${chunkIndex}`), data)
}

/**
 * Stream-based chunk assembler for chunk-directory strategy
 */
export async function assembleChunks(
  transferId: string,
  fileId: string,
  totalChunks: number,
  finalPath: string
): Promise<number> {
  const chunkDir = path.join(UPLOAD_DIR, 'chunks', transferId, fileId)
  const dir = path.dirname(finalPath)
  await ensureDir(dir)

  const writeStream = fs.createWriteStream(finalPath)
  let totalSize = 0

  for (let i = 0; i < totalChunks; i++) {
    const chunkPath = path.join(chunkDir, `chunk_${i}`)
    try {
      const data = await fs.promises.readFile(chunkPath)
      totalSize += data.length
      await new Promise<void>((resolve, reject) => {
        const canContinue = writeStream.write(data, (err) => (err ? reject(err) : resolve()))
        if (!canContinue) {
          writeStream.once('drain', () => {})
        }
      })
    } catch (e) {
      // If chunk is missing, propagate error
      throw new Error(`Missing chunk_${i} during assembly`)
    }
  }

  await new Promise<void>((resolve, reject) => {
    writeStream.end((err?: Error | null) => (err ? reject(err) : resolve()))
  })

  // Cleanup chunks
  await fs.promises.rm(chunkDir, { recursive: true, force: true }).catch(() => {})
  return totalSize
}

export function createReadStream(storagePath: string, options?: { start?: number; end?: number }): fs.ReadStream {
  return fs.createReadStream(storagePath, options)
}

export async function deleteFile(storagePath: string): Promise<void> {
  try {
    await fs.promises.unlink(storagePath)
  } catch {
    // File may already be deleted
  }
}

export async function deleteTransferFiles(transferId: string): Promise<void> {
  const dir = path.join(UPLOAD_DIR, 'files', transferId)
  const chunkDir = path.join(UPLOAD_DIR, 'chunks', transferId)
  await Promise.all([
    fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {}),
    fs.promises.rm(chunkDir, { recursive: true, force: true }).catch(() => {})
  ])
}

export async function getFileSize(storagePath: string): Promise<number> {
  const stat = await fs.promises.stat(storagePath)
  return stat.size
}

/**
 * Purges orphaned temporary upload chunks older than maxAgeMs (default: 24 hours)
 */
export async function cleanOrphanedChunks(maxAgeMs = 24 * 60 * 60 * 1000): Promise<number> {
  const chunksBase = path.join(UPLOAD_DIR, 'chunks')
  if (!fs.existsSync(chunksBase)) return 0

  const now = Date.now()
  let cleanedCount = 0

  try {
    const transferDirs = await fs.promises.readdir(chunksBase, { withFileTypes: true })
    for (const tDir of transferDirs) {
      if (tDir.isDirectory()) {
        const transferPath = path.join(chunksBase, tDir.name)
        const fileDirs = await fs.promises.readdir(transferPath, { withFileTypes: true })
        for (const fDir of fileDirs) {
          const filePath = path.join(transferPath, fDir.name)
          try {
            const stat = await fs.promises.stat(filePath)
            if (now - stat.mtimeMs > maxAgeMs) {
              await fs.promises.rm(filePath, { recursive: true, force: true })
              cleanedCount++
            }
          } catch {}
        }
        const remaining = await fs.promises.readdir(transferPath).catch(() => [])
        if (remaining.length === 0) {
          await fs.promises.rm(transferPath, { recursive: true, force: true }).catch(() => {})
        }
      }
    }
  } catch (err) {
    console.error('Error cleaning orphaned chunks:', err)
  }

  return cleanedCount
}

