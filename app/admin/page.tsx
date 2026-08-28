import { prisma } from '@/lib/prisma'
import AdminClient from '@/components/AdminClient'
import { requireAdmin } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminPage() {
  try {
    await requireAdmin()
  } catch {
    redirect('/login')
  }

  const [userCount, transferCount, activeTransfers, totalDownloads, recentUsers, recentTransfers] = await Promise.all([
    prisma.user.count(),
    prisma.transfer.count(),
    prisma.transfer.count({ where: { isActive: true, expiresAt: { gt: new Date() } } }),
    prisma.downloadLog.count(),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true, email: true, name: true, role: true, isActive: true, createdAt: true, plan: true,
        _count: { select: { transfers: true } }
      }
    }),
    prisma.transfer.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        user: { select: { email: true, name: true } },
        _count: { select: { files: true } }
      }
    })
  ])

  const storageSum = await prisma.transfer.aggregate({ _sum: { totalSize: true } })

  return (
    <AdminClient
      stats={{
        users: userCount,
        transfers: transferCount,
        activeTransfers,
        totalDownloads,
        totalStorage: (storageSum._sum.totalSize || BigInt(0)).toString()
      }}
      users={recentUsers.map(u => ({ ...u, createdAt: u.createdAt.toISOString() }))}
      transfers={recentTransfers.map(t => ({
        id: t.id,
        token: t.token,
        name: t.name,
        isActive: t.isActive,
        expiresAt: t.expiresAt.toISOString(),
        createdAt: t.createdAt.toISOString(),
        downloadCount: t.downloadCount,
        totalSize: t.totalSize.toString(),
        user: t.user,
        _count: t._count
      }))}
    />
  )
}

