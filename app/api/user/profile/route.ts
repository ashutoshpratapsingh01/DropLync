import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        planExpiresAt: true,
        avatar: true,
        brandColor: true,
        brandLogo: true,
        brandWallpaper: true,
        createdAt: true
      }
    })
    if (!dbUser) return apiError('User not found', 404)
    return apiSuccess({ user: dbUser })
  } catch (error: any) {
    return apiError(error?.message || 'Unauthorized', 401)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { name, avatar } = await req.json()

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        name: typeof name === 'string' ? name.trim().slice(0, 50) : undefined,
        avatar: typeof avatar === 'string' ? avatar : undefined
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        avatar: true,
        updatedAt: true
      }
    })

    return apiSuccess({ user: updated })
  } catch (error: any) {
    return apiError(error?.message || 'Failed to update profile', 400)
  }
}
