import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { apiError, apiSuccess, getExpiryDate } from '@/lib/utils'
import { deleteTransferFiles } from '@/lib/storage'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return apiError('Unauthorized', 401)

  const transfer = await prisma.transfer.findFirst({
    where: { id: params.id, userId: user.id },
    include: {
      files: true,
      downloadLogs: { orderBy: { createdAt: 'desc' }, take: 50 }
    }
  })
  if (!transfer) return apiError('Not found', 404)
  return apiSuccess({ transfer })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return apiError('Unauthorized', 401)

  const transfer = await prisma.transfer.findFirst({ where: { id: params.id, userId: user.id } })
  if (!transfer) return apiError('Not found', 404)

  const { action, days } = await req.json()

  if (action === 'disable') {
    await prisma.transfer.update({ where: { id: params.id }, data: { isActive: false } })
    return apiSuccess({ ok: true })
  }

  if (action === 'enable') {
    await prisma.transfer.update({ where: { id: params.id }, data: { isActive: true } })
    return apiSuccess({ ok: true })
  }

  if (action === 'extend') {
    const newExpiry = getExpiryDate(days || 7)
    await prisma.transfer.update({ where: { id: params.id }, data: { expiresAt: newExpiry } })
    return apiSuccess({ expiresAt: newExpiry })
  }

  return apiError('Invalid action')
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSession()
  if (!user) return apiError('Unauthorized', 401)

  const transfer = await prisma.transfer.findFirst({
    where: { id: params.id, userId: user.id },
    include: { files: true }
  })
  if (!transfer) return apiError('Not found', 404)

  await deleteTransferFiles(params.id)
  await prisma.transfer.delete({ where: { id: params.id } })

  return apiSuccess({ ok: true })
}
