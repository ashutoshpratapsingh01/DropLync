import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, hashApiKey } from '@/lib/auth'
import { apiError, apiSuccess, generateSecureToken } from '@/lib/utils'

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const keys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    })
    return apiSuccess({
      apiKeys: keys.map(k => ({
        id: k.id,
        name: k.name,
        key: `dl_live_••••••••${k.id.slice(-4)}`, // Display only masked placeholder, key is stored hashed
        lastUsedAt: k.lastUsedAt?.toISOString() || null,
        createdAt: k.createdAt.toISOString()
      }))
    })
  } catch (error: any) {
    return apiError(error?.message || 'Unauthorized', 401)
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { name } = await req.json()

    if (!name || typeof name !== 'string') {
      return apiError('Key name is required', 400)
    }

    const rawSecret = generateSecureToken(24)
    const rawKey = `dl_live_${rawSecret}`
    const hashedKey = hashApiKey(rawKey)

    const apiKey = await prisma.apiKey.create({
      data: {
        userId: user.id,
        name: name.trim().slice(0, 50),
        key: hashedKey // Stored hashed with SHA-256 in DB, never plaintext
      }
    })

    return apiSuccess({
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        key: rawKey, // Returned to the caller ONLY once upon creation
        createdAt: apiKey.createdAt.toISOString()
      }
    }, 201)
  } catch (error: any) {
    return apiError(error?.message || 'Failed to create API key', 400)
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return apiError('API key ID is required', 400)

    await prisma.apiKey.deleteMany({
      where: { id, userId: user.id }
    })

    return apiSuccess({ success: true, message: 'API key revoked successfully' })
  } catch (error: any) {
    return apiError(error?.message || 'Failed to revoke API key', 400)
  }
}
