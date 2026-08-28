import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess, generateSecureToken } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const webhooks = await prisma.webhook.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    return apiSuccess({
      webhooks: webhooks.map(w => ({
        id: w.id,
        url: w.url,
        events: w.events.split(','),
        isActive: w.isActive,
        createdAt: w.createdAt.toISOString()
      }))
    })
  } catch (error: any) {
    return apiError(error?.message || 'Unauthorized', 401)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { url, events = ['transfer.created', 'transfer.downloaded'] } = await req.json()

    if (!url || typeof url !== 'string' || !url.startsWith('http')) {
      return apiError('A valid HTTPS/HTTP webhook URL is required', 400)
    }

    const secret = `whsec_${generateSecureToken(24)}`
    const webhook = await prisma.webhook.create({
      data: {
        userId: user.id,
        url: url.trim(),
        events: Array.isArray(events) ? events.join(',') : 'transfer.created,transfer.downloaded',
        secret
      }
    })

    return apiSuccess({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events.split(','),
        secret,
        isActive: webhook.isActive,
        createdAt: webhook.createdAt.toISOString()
      }
    }, 201)
  } catch (error: any) {
    return apiError(error?.message || 'Failed to register webhook', 400)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return apiError('Webhook ID is required', 400)

    await prisma.webhook.deleteMany({
      where: { id, userId: user.id }
    })

    return apiSuccess({ success: true, message: 'Webhook endpoint removed' })
  } catch (error: any) {
    return apiError(error?.message || 'Failed to remove webhook', 400)
  }
}
