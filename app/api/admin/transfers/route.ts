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
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'

    const where: any = {}
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { token: { contains: search } },
        { user: { email: { contains: search } } }
      ]
    }

    const now = new Date()
    if (status === 'active') {
      where.isActive = true
      where.expiresAt = { gt: now }
    } else if (status === 'expired') {
      where.OR = [
        { expiresAt: { lte: now } },
        { isActive: false }
      ]
    }

    const [total, transfers] = await Promise.all([
      prisma.transfer.count({ where }),
      prisma.transfer.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, name: true } },
          files: { select: { id: true, originalName: true, size: true, mimeType: true } }
        }
      })
    ])

    return apiSuccess({
      transfers: transfers.map(t => ({
        id: t.id,
        token: t.token,
        name: t.name,
        isActive: t.isActive,
        expiresAt: t.expiresAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
        downloadCount: t.downloadCount,
        maxDownloads: t.maxDownloads,
        totalSize: t.totalSize.toString(),
        fileCount: t.files.length,
        user: t.user,
        files: t.files.map(f => ({ ...f, size: f.size.toString() }))
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error('Admin get transfers error:', error)
    return apiError('Failed to fetch transfers', 500)
  }
}
