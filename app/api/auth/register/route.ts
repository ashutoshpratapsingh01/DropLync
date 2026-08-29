import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword, generateToken } from '@/lib/auth'
import { apiError, apiSuccess, checkRateLimit } from '@/lib/utils'
import { verifyOtpTicket } from '@/lib/tokens'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`register:${ip}`, 10, 60000)) {
    return apiError('Too many requests. Please wait a minute before trying again.', 429)
  }

  const { email, password, name, code, otpToken } = await req.json()

  if (!email) return apiError('Email address is required', 400)
  if (!code) {
    return apiError('Email verification required. Please provide the 6-digit OTP code sent to your email.', 400)
  }

  const normalizedEmail = email.toLowerCase().trim()
  const cleanCode = code.toString().trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return apiError('Invalid email format', 400)
  }

  let isCodeValid = false

  // 1. Try DB verification
  try {
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        email: normalizedEmail,
        code: cleanCode,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    })

    if (tokenRecord) {
      isCodeValid = true
      await prisma.verificationToken.update({
        where: { id: tokenRecord.id },
        data: { isUsed: true, usedAt: new Date() }
      }).catch(() => {})
    }
  } catch (dbErr) {
    console.warn('DB token check warning on register:', dbErr)
  }

  // 2. Stateless signed ticket fallback
  if (!isCodeValid) {
    const ticket = otpToken ||
      req.cookies.get('otp_ticket')?.value ||
      req.headers.get('x-otp-ticket') || ''

    if (ticket) {
      const ticketVerification = verifyOtpTicket(ticket, normalizedEmail, cleanCode)
      if (ticketVerification.valid) {
        isCodeValid = true
      } else {
        return apiError(ticketVerification.reason || 'Invalid or expired verification code', 400)
      }
    }
  }

  if (!isCodeValid) {
    return apiError('Invalid or expired verification code. Please check your email or request a new code.', 400)
  }

  let existing = null
  try {
    existing = await prisma.user.findUnique({ where: { email: normalizedEmail } })
  } catch {}

  if (existing) {
    return apiError('An account with this email is already registered. Please sign in.', 409)
  }

  let passwordHash: string | null = null
  if (password && password.length >= 6) {
    passwordHash = await hashPassword(password)
  }

  let user: any = null
  try {
    user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name?.trim() || normalizedEmail.split('@')[0],
        passwordHash,
        role: 'user',
        plan: 'free',
        isActive: true
      }
    })
  } catch (createErr) {
    console.warn('User creation fallback on register:', createErr)
    user = {
      id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      email: normalizedEmail,
      name: name?.trim() || normalizedEmail.split('@')[0],
      role: 'user',
      plan: 'free',
      isActive: true
    }
  }

  const token = generateToken({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan
  })
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  try {
    await prisma.session.create({ data: { userId: user.id, token, expiresAt } })
  } catch {}

  try {
    await prisma.auditLog.create({ data: { userId: user.id, action: 'otp_register', ipAddress: ip } })
  } catch {}

  const response = NextResponse.json({
    success: true,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, plan: user.plan }
  }, { status: 201 })

  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    expires: expiresAt,
    maxAge: 7 * 24 * 60 * 60,
    path: '/'
  })

  return response
}
