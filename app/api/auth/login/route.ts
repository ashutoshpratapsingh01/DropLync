import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyPassword, generateToken } from '@/lib/auth'
import { apiError, checkRateLimit } from '@/lib/utils'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`login:${ip}`, 10, 60000)) {
    return apiError('Too many requests', 429)
  }

  const { email, password } = await req.json()
  if (!email || !password) return apiError('Email and password required')

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || !user.passwordHash) return apiError('Invalid credentials', 401)
  if (!user.isActive) return apiError('Account disabled', 403)

  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) return apiError('Invalid credentials', 401)

  const token = generateToken(user.id)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.session.create({ data: { userId: user.id, token, expiresAt } })

  await prisma.auditLog.create({ data: { userId: user.id, action: 'login', ipAddress: ip } })

  const response = NextResponse.json({
    success: true,
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role }
  })

  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/'
  })

  return response
}
