import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    await requireAdmin()
  } catch {
    return apiError('Forbidden', 403)
  }

  try {
    const now = new Date()
    const [userCount, transferCount, activeTransfers, totalDownloads, recentUsers, recentTransfers, storageSum] = await Promise.all([
      prisma.user.count(),
      prisma.transfer.count(),
      prisma.transfer.count({ where: { isActive: true, expiresAt: { gt: now } } }),
      prisma.downloadLog.count(),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true }
      }),
      prisma.transfer.findMany({
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          user: { select: { email: true, name: true } },
          files: { select: { id: true, originalName: true, size: true } }
        }
      }),
      prisma.transfer.aggregate({ _sum: { totalSize: true } })
    ])

    return apiSuccess({
      stats: {
        users: userCount,
        transfers: transferCount,
        activeTransfers,
        totalDownloads,
        totalStorage: (storageSum._sum.totalSize || BigInt(0)).toString()
      },
      recentUsers: recentUsers.map(u => ({ ...u, createdAt: u.createdAt.toISOString() })),
      recentTransfers: recentTransfers.map(t => ({
        id: t.id,
        token: t.token,
        name: t.name,
        isActive: t.isActive,
        expiresAt: t.expiresAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
        downloadCount: t.downloadCount,
        totalSize: t.totalSize.toString(),
        fileCount: t.files.length,
        userEmail: t.user?.email || null,
        userName: t.user?.name || null
      }))
    })
  } catch (error: any) {
    console.error('Admin stats error:', error)
    return apiError('Failed to fetch admin stats', 500)
  }
}
