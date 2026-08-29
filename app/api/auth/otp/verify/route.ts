import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, hashPassword } from '@/lib/auth'
import { apiError, apiSuccess, checkRateLimit } from '@/lib/utils'
import { verifyOtpTicket } from '@/lib/tokens'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`otp_verify:${ip}`, 20, 60000)) {
      return apiError('Too many attempts. Please wait a minute and try again.', 429)
    }

    const body = await req.json()
    const { email, code, name, password, otpToken: clientOtpToken } = body

    if (!email || !code) {
      return apiError('Email and 6-digit verification code are required', 400)
    }

    const normalizedEmail = email.toLowerCase().trim()
    const cleanCode = code.toString().trim()

    let isCodeValid = false

    // 1. Try finding valid unused token in database
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
      console.warn('DB token check warning on verify:', dbErr)
    }

    // 2. Resilient Serverless Fallback: Cryptographically verify signed OTP ticket
    if (!isCodeValid) {
      const ticket = clientOtpToken ||
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
      return apiError('Invalid, expired, or already used verification code. Please check your email or request a new code.', 400)
    }

    // Find or create user
    let user: any = null
    try {
      user = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      })
    } catch (dbErr) {
      console.warn('DB user lookup warning:', dbErr)
    }

    if (!user) {
      // Hash password if provided
      let passwordHash: string | null = null
      if (password && typeof password === 'string' && password.length >= 6) {
        passwordHash = await hashPassword(password)
      }

      // Provision new account with 10GB Starter Free Plan
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
        console.warn('User creation fallback:', createErr)
        user = {
          id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          email: normalizedEmail,
          name: name?.trim() || normalizedEmail.split('@')[0],
          role: 'user',
          plan: 'free',
          isActive: true
        }
      }

      try {
        await prisma.auditLog.create({
          data: { userId: user.id, action: 'otp_register', ipAddress: ip }
        })
      } catch {}
    } else {
      if (!user.isActive) {
        return apiError('This account has been deactivated. Please contact support.', 403)
      }

      // If user exists and provided a new password, update it
      if (password && typeof password === 'string' && password.length >= 6 && !user.passwordHash) {
        try {
          const passwordHash = await hashPassword(password)
          await prisma.user.update({
            where: { id: user.id },
            data: { passwordHash }
          })
        } catch {}
      }

      try {
        await prisma.auditLog.create({
          data: { userId: user.id, action: 'otp_login', ipAddress: ip }
        })
      } catch {}
    }

    // Create self-contained session token with complete claims
    const sessionToken = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role || 'user',
      plan: user.plan || 'free'
    })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    try {
      await prisma.session.create({
        data: {
          userId: user.id,
          token: sessionToken,
          expiresAt
        }
      })
    } catch (sessionErr) {
      console.warn('Session DB create warning:', sessionErr)
    }

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'user',
        plan: user.plan || 'free'
      }
    })

    response.cookies.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    })

    // Clear otp_ticket cookie
    response.cookies.set('otp_ticket', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0),
      path: '/'
    })

    return response
  } catch (err: any) {
    console.error('OTP Verify Error:', err)
    return apiError(err.message || 'Verification failed', 500)
  }
}
