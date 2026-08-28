import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try { await requireAdmin() } catch { return apiError('Forbidden', 403) }
  const { isActive } = await req.json()
  await prisma.user.update({ where: { id: params.id }, data: { isActive } })
  return apiSuccess({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try { await requireAdmin() } catch { return apiError('Forbidden', 403) }
  await prisma.user.delete({ where: { id: params.id } })
  return apiSuccess({ ok: true })
}
