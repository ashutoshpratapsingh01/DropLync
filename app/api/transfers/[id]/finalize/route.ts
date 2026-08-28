import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const transfer = await prisma.transfer.findUnique({
      where: { id: params.id },
      include: { files: true }
    })
    if (!transfer) return apiError('Transfer not found', 404)

    // Verify transfer authorization token
    const clientUploadToken = req.headers.get('x-transfer-token')
    const validToken = transfer.uploadToken || transfer.token
    if (!clientUploadToken || clientUploadToken !== validToken) {
      return apiError('Unauthorized: Missing or invalid transfer upload token', 401)
    }

    const totalSize = transfer.files.reduce((s, f) => s + f.size, BigInt(0))

    const updated = await prisma.transfer.update({
      where: { id: params.id },
      data: {
        totalSize,
        isActive: true
      }
    })

    return apiSuccess({
      token: updated.token,
      expiresAt: updated.expiresAt.toISOString(),
      fileCount: transfer.files.length,
      totalSize: updated.totalSize.toString()
    })
  } catch (error: any) {
    console.error(`Finalize transfer ${params.id} error:`, error)
    return apiError(error?.message || 'Failed to finalize transfer', 500)
  }
}
