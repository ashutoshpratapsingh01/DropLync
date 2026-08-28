import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const transfer = await prisma.transfer.findFirst({
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

