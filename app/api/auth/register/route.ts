import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { apiError, apiSuccess, checkRateLimit } from '@/lib/utils'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`register:${ip}`, 10, 60000)) {
    return apiError('Too many requests. Please wait a minute.', 429)
  }

  const { email, password, name, code } = await req.json()

  if (!email) return apiError('Email address is required', 400)
  if (!code) {
    return apiError('Email verification required. Please provide the 6-digit OTP code sent to your email.', 400)
  }

  const normalizedEmail = email.toLowerCase().trim()
  const cleanCode = code.toString().trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return apiError('Invalid email format', 400)
  }

  // Verify OTP from database
  const tokenRecord = await prisma.verificationToken.findFirst({
    where: {
      email: normalizedEmail,
      code: cleanCode,
      isUsed: false,
      expiresAt: { gt: new Date() }
    }
  })

  if (!tokenRecord) {
    return apiError('Invalid or expired verification code. Please check your email or request a new code.', 400)
  }

  // Mark token as used
  await prisma.verificationToken.update({
    where: { id: tokenRecord.id },
    data: { isUsed: true, usedAt: new Date() }
  })

  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  if (existing) {
    return apiError('An account with this email is already registered. Please sign in.', 409)
  }

  let passwordHash: string | null = null
  if (password && password.length >= 6) {
    passwordHash = await hashPassword(password)
  }

  const user = await prisma.user.create({
    data: {
      email: normalizedEmail,
      name: name?.trim() || normalizedEmail.split('@')[0],
      passwordHash,
      role: 'user',
      plan: 'free',
      isActive: true
    }
  })

  const token = generateToken(user.id)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await prisma.session.create({ data: { userId: user.id, token, expiresAt } })

  const cookieStore = cookies()
  cookieStore.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    path: '/'
  })

  await prisma.auditLog.create({ data: { userId: user.id, action: 'otp_register', ipAddress: ip } })

  return apiSuccess({ user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan } }, 201)
}

