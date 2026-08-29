import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/utils'
import { verifyTransferToken } from '@/lib/tokens'
import { UPLOAD_DIR, getStoragePath } from '@/lib/storage'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  let transfer = await prisma.transfer.findFirst({
    where: {
      OR: [
        { token: params.token },
        { customSlug: params.token }
      ]
    },
    include: {
      user: {
        select: {
          brandColor: true,
          brandLogo: true,
          brandWallpaper: true
        }
      },
      files: { select: { id: true, originalName: true, relativePath: true, mimeType: true, size: true, downloadCount: true } }
    }
  })

  // If not found in local DB (Serverless DB isolation), verify signed token and inspect storage files
  if (!transfer) {
    const verified = verifyTransferToken(params.token)
    if (verified) {
      const transferDir = path.join(UPLOAD_DIR, 'files', verified.transferId)
      let fileList: any[] = []

      if (fs.existsSync(transferDir)) {
        try {
          const diskFiles = await fs.promises.readdir(transferDir)
          for (const df of diskFiles) {
            const filePath = path.join(transferDir, df)
            const stat = await fs.promises.stat(filePath)
            const fileId = path.parse(df).name
            fileList.push({
              id: fileId,
              originalName: df,
              size: BigInt(stat.size),
              mimeType: 'application/octet-stream',
              storagePath: filePath,
              downloadCount: 0
            })
          }
        } catch (e) {
          console.warn('Disk file reading warning:', e)
        }
      }

      try {
        transfer = await prisma.transfer.upsert({
          where: { id: verified.transferId },
          update: {},
          create: {
            id: verified.transferId,
            token: params.token,
            uploadToken: params.token,
            name: verified.name || `Transfer ${new Date().toLocaleDateString()}`,
            expiresAt: new Date(verified.expiresAt),
            totalSize: fileList.reduce((acc, f) => acc + f.size, BigInt(0)),
            isActive: true
          },
          include: {
            user: { select: { brandColor: true, brandLogo: true, brandWallpaper: true } },
            files: { select: { id: true, originalName: true, relativePath: true, mimeType: true, size: true, downloadCount: true } }
          }
        })
      } catch (upsertErr) {
        console.warn('Upsert fallback transfer warning:', upsertErr)
      }

      if (!transfer && fileList.length > 0) {
        return apiSuccess({
          id: verified.transferId,
          token: params.token,
          name: verified.name || 'Transfer',
          expiresAt: verified.expiresAt,
          totalSize: fileList.reduce((acc, f) => acc + f.size, BigInt(0)).toString(),
          downloadCount: 0,
          maxDownloads: null,
          hasPassword: false,
          branding: null,
          files: fileList.map(f => ({ ...f, size: f.size.toString() }))
        })
      }
    }
  }

  if (!transfer) return apiError('Transfer not found', 404)
  if (!transfer.isActive) return apiError('This transfer has been disabled', 410)
  if (transfer.expiresAt < new Date()) return apiError('This transfer has expired', 410)
  if (transfer.maxDownloads && transfer.downloadCount >= transfer.maxDownloads) {
    return apiError('Download limit reached', 410)
  }

  return apiSuccess({
    id: transfer.id,
    token: transfer.token,
    customSlug: transfer.customSlug,
    name: transfer.name,
    expiresAt: transfer.expiresAt,
    totalSize: transfer.totalSize.toString(),
    downloadCount: transfer.downloadCount,
    maxDownloads: transfer.maxDownloads,
    hasPassword: !!transfer.passwordHash,
    branding: transfer.user ? {
      brandColor: transfer.user.brandColor,
      brandLogo: transfer.user.brandLogo,
      brandWallpaper: transfer.user.brandWallpaper
    } : null,
    files: transfer.passwordHash ? [] : transfer.files.map(f => ({
      ...f, size: f.size.toString()
    }))
  })
}
