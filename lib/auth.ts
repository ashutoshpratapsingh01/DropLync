import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { prisma } from './prisma'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

const JWT_SECRET = process.env.JWT_SECRET!

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export function generateToken(userId: string): string {
  return jwt.sign({ userId, nonce: uuidv4() }, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string }
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
  if (!payload) return null

  const session = await prisma.session.findFirst({
    where: { token, expiresAt: { gt: new Date() } },
    include: { user: true }
  })
  return session?.user ?? null
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
