import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/utils'
import { writeChunkDirect, getStoragePath } from '@/lib/storage'
import { verifyUploadTicket, verifyTransferToken } from '@/lib/tokens'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { fileId: string } }) {
  try {
    const clientUploadToken = req.headers.get('x-transfer-token') || ''
    if (!clientUploadToken) {
      return apiError('Unauthorized: Missing transfer upload token', 401)
    }

    let storagePath: string | null = null

    // 1. Try DB lookup first
    try {
      const file = await prisma.transferFile.findUnique({
        where: { id: params.fileId },
        include: { transfer: true }
      })
      if (file && file.transfer && file.transfer.isActive) {
        const validToken = file.transfer.uploadToken || file.transfer.token
        if (clientUploadToken === validToken || verifyUploadTicket(clientUploadToken) !== null || verifyTransferToken(clientUploadToken) !== null) {
          storagePath = file.storagePath || getStoragePath(file.transferId, params.fileId, file.originalName)
        }
      }
    } catch (dbErr) {
      console.warn('DB lookup warning on chunk:', dbErr)
    }

    // 2. Fallback: Cryptographically verified upload ticket (for Serverless multi-instance resilience)
    if (!storagePath) {
      const verifiedTicket = verifyUploadTicket(clientUploadToken)
      if (verifiedTicket) {
        if (verifiedTicket.fileId && verifiedTicket.fileId !== params.fileId && verifiedTicket.fileId !== 'transfer_root') {
          return apiError('Upload token mismatch for this fileId', 401)
        }
        storagePath = getStoragePath(verifiedTicket.transferId, params.fileId, verifiedTicket.filename || 'data.bin')
      }
    }

    if (!storagePath) {
      return apiError('File or transfer session not found or token expired', 404)
    }

    const formData = await req.formData()
    const chunk = formData.get('chunk') as File
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)
    const chunkSize = parseInt(formData.get('chunkSize') as string) || (3 * 1024 * 1024)

    if (!chunk || isNaN(chunkIndex)) return apiError('Invalid chunk data')

    const arrayBuffer = await chunk.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Write chunk directly at byte offset: chunkIndex * chunkSize
    await writeChunkDirect(storagePath, chunkIndex, chunkSize, buffer)

    return apiSuccess({
      fileId: params.fileId,
      chunkIndex,
      totalChunks,
      receivedBytes: buffer.length
    })
  } catch (error: any) {
    console.error(`Chunk upload error on file ${params.fileId}:`, error)
    return apiError(error?.message || 'Failed to save chunk', 500)
  }
}
