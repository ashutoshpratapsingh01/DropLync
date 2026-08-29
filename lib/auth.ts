import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from './prisma'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const JWT_SECRET = process.env.JWT_SECRET || 'droplync-super-secret-jwt-key-change-in-production-min-32-chars'

export interface UserSessionPayload {
  userId: string
  email?: string
  name?: string | null
  role?: string
  plan?: string
  nonce?: string
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function generateToken(user: string | { id: string; email: string; name?: string | null; role?: string; plan?: string }): string {
  const payload: UserSessionPayload = typeof user === 'string'
    ? { userId: user, nonce: uuidv4() }
    : {
        userId: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        plan: user.plan || 'free',
        nonce: uuidv4()
      }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): UserSessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSessionPayload
  } catch {
    return null
  }
}

export function hashApiKey(rawKey: string): string {
  return crypto.createHash('sha256').update(rawKey).digest('hex')
}

export async function getSession() {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (!token) return null

  const payload = verifyToken(token)
  if (!payload || !payload.userId) return null

  try {
    // 1. Try finding active session in database
    const session = await prisma.session.findFirst({
      where: { token, expiresAt: { gt: new Date() } },
      include: { user: true }
    })
    if (session?.user && session.user.isActive) {
      return session.user
    }

    // 2. Lookup user directly from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })
    if (user && user.isActive) {
      return user
    }

    // 3. Resilient Fallback for Serverless Isolation: Reconstruct from verified signed JWT claims
    if (payload.email) {
      const fallbackUser: any = {
        id: payload.userId,
        email: payload.email,
        name: payload.name || payload.email.split('@')[0],
        role: payload.role || 'user',
        plan: payload.plan || 'free',
        brandColor: null,
        brandLogo: null,
        brandWallpaper: null,
        passwordHash: null,
        avatar: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }

      try {
        await prisma.user.upsert({
          where: { id: payload.userId },
          update: {},
          create: {
            id: payload.userId,
            email: payload.email,
            name: fallbackUser.name,
            role: fallbackUser.role,
            plan: fallbackUser.plan,
            isActive: true
          }
        })
      } catch (upsertErr) {
        console.warn('Session user upsert fallback warning:', upsertErr)
      }

      return fallbackUser
    }
  } catch (err) {
    console.error('getSession db error:', err)
  }

  return null
}

/**
 * Authenticates request via API Key (x-api-key header) OR Session Cookie.
 */
export async function authenticateRequest(req?: NextRequest) {
  if (req) {
    const rawApiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    if (rawApiKey && rawApiKey.startsWith('dl_live_')) {
      const hashed = hashApiKey(rawApiKey)
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { key: hashed },
        include: { user: true }
      })
      if (apiKeyRecord && apiKeyRecord.user && apiKeyRecord.user.isActive) {
        // Update lastUsedAt asynchronously
        prisma.apiKey.update({
          where: { id: apiKeyRecord.id },
          data: { lastUsedAt: new Date() }
        }).catch(() => {})
        return apiKeyRecord.user
      }
      return null
    }
  }

  return getSession()
}

export async function requireAuth(req?: NextRequest) {
  const user = await authenticateRequest(req)
  if (!user) throw new Error('Unauthorized')
  return user
}

export async function requireAdmin(req?: NextRequest) {
  const user = await requireAuth(req)
  if (user.role !== 'admin') throw new Error('Forbidden')
  return user
}
