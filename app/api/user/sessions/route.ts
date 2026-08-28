import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'
import { cookies } from 'next/headers'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const currentToken = cookies().get('auth_token')?.value

    const sessions = await prisma.session.findMany({
      where: { userId: user.id, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' }
    })

    return apiSuccess({
      sessions: sessions.map(s => ({
        id: s.id,
        isCurrent: s.token === currentToken,
        userAgent: s.userAgent || 'Web Browser',
        ipAddress: s.ipAddress || '127.0.0.1',
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString()
      }))
    })
  } catch (error: any) {
    return apiError(error?.message || 'Unauthorized', 401)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const currentToken = cookies().get('auth_token')?.value

    if (!currentToken) return apiError('No active session token', 400)

    // Revoke all other sessions
    const deleted = await prisma.session.deleteMany({
      where: {
        userId: user.id,
        token: { not: currentToken }
      }
    })

    return apiSuccess({
      success: true,
      message: `Revoked ${deleted.count} other session(s)`
    })
  } catch (error: any) {
    return apiError(error?.message || 'Failed to revoke sessions', 400)
  }
}
