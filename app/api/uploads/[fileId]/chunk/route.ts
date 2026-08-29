import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/utils'
import { writeChunkDirect, getStoragePath } from '@/lib/storage'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const runtime = 'nodejs'

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


    const formData = await req.formData()
    const chunk = formData.get('chunk') as File
    const chunkIndex = parseInt(formData.get('chunkIndex') as string)
    const totalChunks = parseInt(formData.get('totalChunks') as string)
    const chunkSize = parseInt(formData.get('chunkSize') as string) || (5 * 1024 * 1024)

    if (!chunk || isNaN(chunkIndex)) return apiError('Invalid chunk data')

    const storagePath = file.storagePath || getStoragePath(file.transferId, params.fileId, file.originalName)
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
