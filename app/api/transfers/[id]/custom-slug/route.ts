import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await requireAuth()
    const { slug } = await req.json()

    if (!slug || typeof slug !== 'string') {
      return apiError('Custom slug is required', 400)
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-_]/g, '')
    if (cleanSlug.length < 3 || cleanSlug.length > 50) {
      return apiError('Slug must be between 3 and 50 alphanumeric characters or dashes', 400)
    }

    // Reserved slugs check
    const reserved = ['admin', 'api', 'login', 'register', 'dashboard', 'settings', 'pricing', 'download']
    if (reserved.includes(cleanSlug)) {
      return apiError('This custom link is reserved. Please choose another.', 400)
    }

    // Verify transfer belongs to user
    const transfer = await prisma.transfer.findFirst({
      where: { id: params.id, userId: user.id }
    })
    if (!transfer) return apiError('Transfer not found or not owned by you', 404)

    // Check slug uniqueness
    const existing = await prisma.transfer.findFirst({
      where: {
        customSlug: cleanSlug,
        id: { not: params.id }
      }
    })
    if (existing) {
      return apiError('This custom link is already in use. Please choose a different one.', 409)
    }

    const updated = await prisma.transfer.update({
      where: { id: params.id },
      data: { customSlug: cleanSlug }
    })

    return apiSuccess({
      success: true,
      customSlug: updated.customSlug,
      shareUrl: `/f/${updated.customSlug}`
    })
  } catch (error: any) {
    return apiError(error?.message || 'Failed to assign custom slug', 400)
  }
}
