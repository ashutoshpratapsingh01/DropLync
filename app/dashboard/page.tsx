import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'
import DashboardClient from '@/components/DashboardClient'

export default async function DashboardPage() {
  const user = await getSession()
  if (!user) redirect('/login')

  const [transfers, stats] = await Promise.all([
    prisma.transfer.findMany({
      where: { userId: user.id },
      include: { files: { select: { id: true, size: true } } },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.transfer.aggregate({
      where: { userId: user.id },
      _count: { id: true },
      _sum: { downloadCount: true, totalSize: true }
    })
  ])

  const activeCount = transfers.filter(t => t.isActive && t.expiresAt > new Date()).length
  const expiredCount = transfers.filter(t => !t.isActive || t.expiresAt <= new Date()).length

  return (
    <DashboardClient
      user={{ name: user.name, email: user.email }}
      transfers={transfers.map(t => ({
        ...t,
        totalSize: t.totalSize.toString(),
        files: t.files.map(f => ({ ...f, size: f.size.toString() }))
      }))}
      stats={{
        total: stats._count.id,
        active: activeCount,
        expired: expiredCount,
        totalDownloads: stats._sum.downloadCount || 0,
        totalStorage: (stats._sum.totalSize || BigInt(0)).toString()
      }}
    />
  )
}
