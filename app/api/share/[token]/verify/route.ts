import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess, checkRateLimit } from '@/lib/utils'
import bcrypt from 'bcryptjs'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`verify:${ip}`, 10, 60000)) return apiError('Too many attempts', 429)

  const { password } = await req.json()
  const transfer = await prisma.transfer.findUnique({
    where: { token: params.token },
    include: { files: { select: { id: true, originalName: true, mimeType: true, size: true, downloadCount: true } } }
  })

  if (!transfer) return apiError('Transfer not found', 404)
  if (!transfer.isActive || transfer.expiresAt < new Date()) return apiError('Transfer unavailable', 410)
  if (!transfer.passwordHash) return apiError('No password required')

  const valid = await bcrypt.compare(password, transfer.passwordHash)
  if (!valid) return apiError('Incorrect password', 401)

  return apiSuccess({
    files: transfer.files.map(f => ({ ...f, size: f.size.toString() }))
  })
}
