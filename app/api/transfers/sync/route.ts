import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const user = await getSession()
  if (!user) return apiError('Unauthorized', 401)

  try {
    const { transfers } = await req.json()
    if (!Array.isArray(transfers) || transfers.length === 0) {
      return apiSuccess({ synced: 0 })
    }

    let syncedCount = 0

    for (const t of transfers) {
      if (!t.id || !t.token) continue

      try {
        const existing = await prisma.transfer.findUnique({
          where: { id: t.id }
        })

        if (!existing) {
          const expiresAt = t.expiresAt ? new Date(t.expiresAt) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          const totalSizeBigInt = BigInt(t.totalSize || '0')

          await prisma.transfer.create({
            data: {
              id: t.id,
              token: t.token,
              userId: user.id,
              name: t.name || 'Transfer',
              expiresAt,
              totalSize: totalSizeBigInt,
              isActive: t.isActive !== false,
              downloadCount: t.downloadCount || 0,
              maxDownloads: t.maxDownloads || null
            }
          })
          syncedCount++
        } else if (!existing.userId) {
          await prisma.transfer.update({
            where: { id: t.id },
            data: { userId: user.id }
          })
          syncedCount++
        }
      } catch (err) {
        console.warn('Sync transfer item warning:', err)
      }
    }

    return apiSuccess({ synced: syncedCount })
  } catch (error: any) {
    console.error('Transfer sync error:', error)
    return apiError(error.message || 'Failed to sync transfers', 500)
  }
}
