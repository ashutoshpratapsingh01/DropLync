import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { authenticateRequest, getSession } from '@/lib/auth'
import { generateSecureToken, getExpiryDate, apiError, apiSuccess, checkRateLimit } from '@/lib/utils'
import bcrypt from 'bcryptjs'


export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`transfer:${ip}`, 30, 60000)) return apiError('Too many requests', 429)

  try {
    const user = await authenticateRequest(req)
    const { name, expiryDays = 7, maxDownloads = 0, password } = await req.json()


    const token = generateSecureToken(32)
    const uploadToken = generateSecureToken(32)
    const expiresAt = getExpiryDate(Math.min(Math.max(1, Number(expiryDays) || 7), 30))
    const passwordHash = password ? await bcrypt.hash(password, 10) : null
    const parsedMaxDownloads = parseInt(maxDownloads)

    const transfer = await prisma.transfer.create({
      data: {
        token,
        uploadToken,
        name: name ? String(name).slice(0, 100) : `Transfer ${new Date().toLocaleDateString()}`,
        userId: user?.id ?? null,
        passwordHash,
        expiresAt,
        maxDownloads: !isNaN(parsedMaxDownloads) && parsedMaxDownloads > 0 ? parsedMaxDownloads : null,
        totalSize: BigInt(0),
        isActive: true
      }
    })

    return apiSuccess({
      transferId: transfer.id,
      token: transfer.token,
      uploadToken: transfer.uploadToken,
      expiresAt: transfer.expiresAt.toISOString()
    }, 201)

  } catch (error: any) {
    console.error('Transfer creation error:', error)
    return apiError(error?.message || 'Failed to create transfer', 500)
  }
}

export async function GET(req: NextRequest) {
  const user = await getSession()
  if (!user) return apiError('Unauthorized', 401)

  try {
    const transfers = await prisma.transfer.findMany({
      where: { userId: user.id },
      include: {
        files: {
          select: { id: true, originalName: true, size: true, mimeType: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return apiSuccess({ transfers })
  } catch (error: any) {
    console.error('Get transfers error:', error)
    return apiError('Failed to fetch transfers', 500)
  }
}
