import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/utils'
import { getStoragePath, getFileSize, assembleChunks, UPLOAD_DIR } from '@/lib/storage'
import { scanFileContent } from '@/lib/scanner'
import fs from 'fs'
import path from 'path'

export async function POST(req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const file = await prisma.transferFile.findUnique({
      where: { id: params.fileId },
      include: { transfer: true }
    })
    if (!file || !file.transfer || !file.transfer.isActive) return apiError('File or transfer session not found', 404)

    // Validate transfer authorization token
    const clientUploadToken = req.headers.get('x-transfer-token')
    const validToken = file.transfer.uploadToken || file.transfer.token
    if (!clientUploadToken || clientUploadToken !== validToken) {
      return apiError('Unauthorized: Missing or invalid transfer upload token', 401)
    }

    const storagePath = file.storagePath || getStoragePath(file.transferId, params.fileId, file.originalName)

    let finalSize = 0

    // Check if the direct-written file exists
    try {
      finalSize = await getFileSize(storagePath)
    } catch {
      // If direct file is not found, check if chunks directory exists as fallback
      const chunkDir = path.join(UPLOAD_DIR, 'chunks', file.transferId, params.fileId)
      try {
        const entries = await fs.promises.readdir(chunkDir)
        const totalChunks = entries.filter(e => e.startsWith('chunk_')).length
        if (totalChunks > 0) {
          finalSize = await assembleChunks(file.transferId, params.fileId, totalChunks, storagePath)
        }
      } catch (err) {
        console.error('Fallback assembly failed:', err)
      }
    }

    if (finalSize === 0 && Number(file.size) > 0) {
      // If file exists or stat was 0, check stat again
      try {
        const stat = await fs.promises.stat(storagePath)
        finalSize = stat.size
      } catch {}
    }

    const actualSize = finalSize > 0 ? BigInt(finalSize) : file.size

    // Deep content malware & dangerous executable scanning (Item 16)
    const scan = await scanFileContent(storagePath, file.originalName)
    if (!scan.isSafe) {
      // Quarantine & delete dangerous file from disk immediately
      await fs.promises.rm(storagePath, { force: true }).catch(() => {})
      await prisma.transferFile.delete({ where: { id: params.fileId } }).catch(() => {})
      return apiError(`Security violation: Malware or dangerous executable payload detected (${scan.threatName}). Upload rejected.`, 422)
    }

    await prisma.transferFile.update({
      where: { id: params.fileId },
      data: {
        storagePath,
        size: actualSize
      }
    })


    // Recalculate aggregate Transfer.totalSize for data integrity
    const allTransferFiles = await prisma.transferFile.findMany({
      where: { transferId: file.transferId },
      select: { size: true }
    })
    const aggregateTotalSize = allTransferFiles.reduce((acc, f) => acc + f.size, BigInt(0))

    await prisma.transfer.update({
      where: { id: file.transferId },
      data: { totalSize: aggregateTotalSize }
    })

    return apiSuccess({
      ok: true,
      fileId: params.fileId,
      size: actualSize.toString(),
      transferTotalSize: aggregateTotalSize.toString()
    })

  } catch (error: any) {
    console.error(`Complete upload error on file ${params.fileId}:`, error)
    return apiError(error?.message || 'Failed to complete upload', 500)
  }
}
