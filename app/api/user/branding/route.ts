import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { brandColor: true, brandLogo: true, brandWallpaper: true, plan: true }
    })
    return apiSuccess({ branding: dbUser })
  } catch (error: any) {
    return apiError(error?.message || 'Unauthorized', 401)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { brandColor, brandLogo, brandWallpaper } = await req.json()

    // Validate hex color if provided
    if (brandColor && !/^#([0-9a-fA-F]{3}){1,2}$/.test(brandColor)) {
      return apiError('Invalid hex color format (e.g. #3b82f6)', 400)
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        brandColor: brandColor || null,
        brandLogo: brandLogo || null,
        brandWallpaper: brandWallpaper || null
      },
      select: { brandColor: true, brandLogo: true, brandWallpaper: true, plan: true }
    })

    return apiSuccess({ branding: updated })
  } catch (error: any) {
    return apiError(error?.message || 'Failed to update branding', 400)
  }
}
