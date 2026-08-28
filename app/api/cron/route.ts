import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { deleteTransferFiles, cleanOrphanedChunks } from '@/lib/storage'
import { apiSuccess, apiError } from '@/lib/utils'

// Call this endpoint with a cron job (e.g. every hour)
// Protect with a secret header in production
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret')
  const expectedSecret = process.env.CRON_SECRET

  // Fail closed: if CRON_SECRET is missing from environment or header does not match, reject unconditionally
  if (!expectedSecret || !secret || secret !== expectedSecret) {
    return apiError('Unauthorized: Invalid or missing cron authorization secret', 401)
  }

  const now = new Date()

  // 1. Find expired transfers that still have files
  const expired = await prisma.transfer.findMany({
    where: {
      OR: [
        { expiresAt: { lt: now } },
        { isActive: false }
      ]
    },
    select: { id: true }
  })

  let cleaned = 0
  for (const t of expired) {
    try {
      await deleteTransferFiles(t.id)
      cleaned++
    } catch {
      // Continue with others
    }
  }

  // 2. Clean up expired user sessions
  await prisma.session.deleteMany({ where: { expiresAt: { lt: now } } })

  // 3. Clean up expired verification tokens (Item 11)
  const tokenPurgeResult = await prisma.verificationToken.deleteMany({
    where: { expiresAt: { lt: now } }
  })

  // 4. Clean up old download logs (keep 30 days for GDPR compliance)
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  await prisma.downloadLog.deleteMany({ where: { createdAt: { lt: cutoff } } })

  // 5. Clean up orphaned upload chunks older than 24h (Item 10)
  const orphanedChunksCleaned = await cleanOrphanedChunks(24 * 60 * 60 * 1000)

  return apiSuccess({
    cleaned,
    expiredCount: expired.length,
    expiredTokensPurged: tokenPurgeResult.count,
    orphanedChunksCleaned
  })
}

