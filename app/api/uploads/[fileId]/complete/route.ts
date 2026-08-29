import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/utils'
import { getStoragePath, getFileSize, assembleChunks, UPLOAD_DIR } from '@/lib/storage'
import { scanFileContent } from '@/lib/scanner'
import { verifyUploadTicket, verifyTransferToken } from '@/lib/tokens'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const clientUploadToken = req.headers.get('x-transfer-token') || ''
    if (!clientUploadToken) {
      return apiError('Unauthorized: Missing transfer upload token', 401)
    }

    let file: any = null
    try {
      file = await prisma.transferFile.findUnique({
        where: { id: params.fileId },
        include: { transfer: true }
      })
    } catch (dbErr) {
      console.warn('DB lookup warning on complete:', dbErr)
    }

    let transferId = file?.transferId
    let originalName = file?.originalName
    let storagePath = file?.storagePath

    // If file record was not found in local DB (Serverless DB isolation), reconstruct from verified token
    if (!file) {
      const verifiedTicket = verifyUploadTicket(clientUploadToken)
      if (verifiedTicket) {
        transferId = verifiedTicket.transferId
        originalName = verifiedTicket.filename || `file_${params.fileId.slice(0, 8)}`
        storagePath = getStoragePath(transferId, params.fileId, originalName)

        try {
          // Upsert transfer & transferFile
          await prisma.transfer.upsert({
            where: { id: transferId },
            update: {},
            create: {
              id: transferId,
              token: clientUploadToken,
              uploadToken: clientUploadToken,
              name: `Transfer ${new Date().toLocaleDateString()}`,
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              totalSize: BigInt(verifiedTicket.size || 0),
              isActive: true
            }
          })

          file = await prisma.transferFile.upsert({
            where: { id: params.fileId },
            update: { storagePath, size: BigInt(verifiedTicket.size || 0) },
            create: {
              id: params.fileId,
              transferId,
              originalName,
              storagePath,
              mimeType: verifiedTicket.mimeType || 'application/octet-stream',
              size: BigInt(verifiedTicket.size || 0)
            },
            include: { transfer: true }
          })
        } catch (upsertErr) {
          console.warn('Upsert fallback warning on complete:', upsertErr)
        }
      }
    }

    if (!storagePath && transferId && originalName) {
      storagePath = getStoragePath(transferId, params.fileId, originalName)
    }

    if (!storagePath) {
      return apiError('File session not found or token invalid', 404)
    }

    let finalSize = 0

    // Check if the direct-written file exists
    try {
      finalSize = await getFileSize(storagePath)
    } catch {
      // If direct file is not found, check if chunks directory exists as fallback
      const chunkDir = path.join(UPLOAD_DIR, 'chunks', transferId || 'default', params.fileId)
      try {
        const entries = await fs.promises.readdir(chunkDir)
        const totalChunks = entries.filter(e => e.startsWith('chunk_')).length
        if (totalChunks > 0) {
          finalSize = await assembleChunks(transferId || 'default', params.fileId, totalChunks, storagePath)
        }
      } catch (err) {
        console.error('Fallback assembly failed:', err)
      }
    }

    if (finalSize === 0 && file && Number(file.size) > 0) {
      try {
        const stat = await fs.promises.stat(storagePath)
        finalSize = stat.size
      } catch {}
    }

    const actualSize = finalSize > 0 ? BigInt(finalSize) : (file?.size || BigInt(0))

    // Deep content malware & dangerous executable scanning
    const scan = await scanFileContent(storagePath, originalName || 'file')
    if (!scan.isSafe) {
      await fs.promises.rm(storagePath, { force: true }).catch(() => {})
      await prisma.transferFile.delete({ where: { id: params.fileId } }).catch(() => {})
      return apiError(`Security violation: Malware or dangerous payload detected (${scan.threatName}). Upload rejected.`, 422)
    }

    try {
      await prisma.transferFile.update({
        where: { id: params.fileId },
        data: {
          storagePath,
          size: actualSize
        }
      })

      if (transferId) {
        const allTransferFiles = await prisma.transferFile.findMany({
          where: { transferId },
          select: { size: true }
        })
        const aggregateTotalSize = allTransferFiles.reduce((acc, f) => acc + f.size, BigInt(0))

        await prisma.transfer.update({
          where: { id: transferId },
          data: { totalSize: aggregateTotalSize }
        })
      }
    } catch (dbUpdateErr) {
      console.warn('DB update warning on complete:', dbUpdateErr)
    }

    return apiSuccess({
      ok: true,
      fileId: params.fileId,
      size: actualSize.toString()
    })

  } catch (error: any) {
    console.error(`Complete upload error on file ${params.fileId}:`, error)
    return apiError(error?.message || 'Failed to complete upload', 500)
  }
}
