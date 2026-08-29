import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/utils'
import { verifyTransferToken, verifyUploadTicket } from '@/lib/tokens'
import { UPLOAD_DIR } from '@/lib/storage'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const clientUploadToken = req.headers.get('x-transfer-token') || ''
    let transfer: any = null

    try {
      transfer = await prisma.transfer.findUnique({
        where: { id: params.id },
        include: { files: true }
      })
    } catch (dbErr) {
      console.warn('DB lookup warning on finalize:', dbErr)
    }

    // Fallback: verify signed token if DB instance is isolated
    if (!transfer && clientUploadToken) {
      const verified = verifyTransferToken(clientUploadToken) || verifyUploadTicket(clientUploadToken)
      if (verified && (verified.transferId === params.id || (verified as any).id === params.id)) {
        const transferDir = path.join(UPLOAD_DIR, 'files', params.id)
        let totalBytes = BigInt(0)
        let fileCount = 0

        if (fs.existsSync(transferDir)) {
          try {
            const diskFiles = await fs.promises.readdir(transferDir)
            fileCount = diskFiles.length
            for (const df of diskFiles) {
              const stat = await fs.promises.stat(path.join(transferDir, df))
              totalBytes += BigInt(stat.size)
            }
          } catch {}
        }

        try {
          transfer = await prisma.transfer.upsert({
            where: { id: params.id },
            update: { totalSize: totalBytes, isActive: true },
            create: {
              id: params.id,
              token: (verified as any).token || clientUploadToken,
              uploadToken: clientUploadToken,
              name: (verified as any).name || `Transfer ${new Date().toLocaleDateString()}`,
              expiresAt: new Date((verified as any).expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000),
              totalSize: totalBytes,
              isActive: true
            },
            include: { files: true }
          })
        } catch (upsertErr) {
          console.warn('Upsert fallback warning on finalize:', upsertErr)
        }

        if (!transfer) {
          return apiSuccess({
            token: (verified as any).token || clientUploadToken,
            expiresAt: (verified as any).expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            fileCount: fileCount || 1,
            totalSize: totalBytes.toString()
          })
        }
      }
    }

    if (!transfer) return apiError('Transfer not found', 404)

    const totalSize = (transfer.files && transfer.files.length > 0)
      ? transfer.files.reduce((s: bigint, f: any) => s + f.size, BigInt(0))
      : transfer.totalSize

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
      fileCount: transfer.files?.length || 1,
      totalSize: updated.totalSize.toString()
    })
  } catch (error: any) {
    console.error(`Finalize transfer ${params.id} error:`, error)
    return apiError(error?.message || 'Failed to finalize transfer', 500)
  }
}
