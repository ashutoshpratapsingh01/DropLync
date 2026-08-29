import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/DashboardClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardPage() {
  const user = await getSession()
  if (!user) {
    redirect('/login')
  }

  let transfers: any[] = []
  let activeCount = 0
  let expiredCount = 0
  let totalDownloads = 0
  let totalStorage = '0'

  try {
    const [userTransfers, stats] = await Promise.all([
      prisma.transfer.findMany({
        where: { userId: user.id },
        include: { files: { select: { id: true, size: true, originalName: true, mimeType: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.transfer.aggregate({
        where: { userId: user.id },
        _count: { id: true },
        _sum: { downloadCount: true, totalSize: true }
      })
    ])

    const now = new Date()
    activeCount = userTransfers.filter(t => t.isActive && t.expiresAt > now).length
    expiredCount = userTransfers.filter(t => !t.isActive || t.expiresAt <= now).length
    totalDownloads = stats._sum.downloadCount || 0
    totalStorage = (stats._sum.totalSize || BigInt(0)).toString()

    transfers = userTransfers.map(t => ({
      ...t,
      totalSize: (t.totalSize || BigInt(0)).toString(),
      files: (t.files || []).map(f => ({ ...f, size: (f.size || BigInt(0)).toString() }))
    }))
  } catch (err) {
    console.error('Dashboard data query error:', err)
  }

  return (
    <DashboardClient
      user={{ name: user.name, email: user.email, plan: (user as any).plan || 'free' }}
      transfers={transfers}
      stats={{
        total: transfers.length,
        active: activeCount,
        expired: expiredCount,
        totalDownloads,
        totalStorage
      }}
    />
  )
}
