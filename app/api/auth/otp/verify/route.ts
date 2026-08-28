import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, hashPassword } from '@/lib/auth'
import { apiError, apiSuccess, checkRateLimit } from '@/lib/utils'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`otp_verify:${ip}`, 20, 60000)) {
      return apiError('Too many attempts. Please wait a minute and try again.', 429)
    }

    const { email, code, name, password } = await req.json()

    if (!email || !code) {
      return apiError('Email and 6-digit verification code are required', 400)
    }

    const normalizedEmail = email.toLowerCase().trim()
    const cleanCode = code.toString().trim()

    // Find valid unused token
    const tokenRecord = await prisma.verificationToken.findFirst({
      where: {
        email: normalizedEmail,
        code: cleanCode,
        isUsed: false,
        expiresAt: { gt: new Date() }
      }
    })

    if (!tokenRecord) {
      return apiError('Invalid, expired, or already used verification code. Please check your email or request a new code.', 400)
    }

    // Mark OTP token as verified & used immediately
    await prisma.verificationToken.update({
      where: { id: tokenRecord.id },
      data: { isUsed: true, usedAt: new Date() }
    })

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      // Hash password if provided
      let passwordHash: string | null = null
      if (password && typeof password === 'string' && password.length >= 6) {
        passwordHash = await hashPassword(password)
      }

      // Provision new account with 10GB Starter Free Plan
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
      await prisma.auditLog.create({
        data: { userId: user.id, action: 'otp_register', ipAddress: ip }
      })
    } else {
      if (!user.isActive) {
        return apiError('This account has been deactivated. Please contact support.', 403)
      }

      // If user exists and provided a new password, update it
      if (password && typeof password === 'string' && password.length >= 6 && !user.passwordHash) {
        const passwordHash = await hashPassword(password)
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash }
        })
      }

      await prisma.auditLog.create({
        data: { userId: user.id, action: 'otp_login', ipAddress: ip }
      })
    }

    // Create session token
    const sessionToken = generateToken(user.id)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt
      }
    })

    const response = NextResponse.json({
      success: true,
      token: sessionToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        plan: user.plan
      }
    })

    response.cookies.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    })

    return response
  } catch (err: any) {
    console.error('OTP Verify Error:', err)
    return apiError(err.message || 'Verification failed', 500)
  }
}

