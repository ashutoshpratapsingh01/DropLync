import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'
import { apiError, apiSuccess, checkRateLimit } from '@/lib/utils'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`google_auth:${ip}`, 30, 60000)) {
      return apiError('Too many attempts. Please try again later.', 429)
    }

    const body = await req.json()
    const { email, name, avatar, googleId, credential } = body

    if (!email || !email.includes('@')) {
      return apiError('Valid email is required for Google Sign-In')
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find existing user or auto-provision
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    })

    if (!user) {
      // Auto-provision new 10GB Starter account
      user = await prisma.user.create({
        data: {
          email: normalizedEmail,
          name: name?.trim() || normalizedEmail.split('@')[0],
          avatar: avatar || null,
          role: 'user',
          plan: 'free',
          isActive: true
        }
      })

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'google_oauth_register',
          details: `Registered via Google Account Chooser (${normalizedEmail})`,
          ipAddress: ip
        }
      })
    } else {
      if (!user.isActive) {
        return apiError('Account has been suspended', 403)
      }

      // Update avatar if provided and not yet set
      if (avatar && !user.avatar) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { avatar }
        })
      }

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'google_oauth_login',
          details: `Signed in via Google Account Chooser (${normalizedEmail})`,
          ipAddress: ip
        }
      })
    }

    // Generate session token
    const sessionToken = generateToken(user.id)
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await prisma.session.create({
      data: {
        userId: user.id,
        token: sessionToken,
        expiresAt
      }
    })

    // Set secure auth cookie
    const cookieStore = cookies()
    cookieStore.set('auth_token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    })

    return apiSuccess({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
        plan: user.plan
      }
    })
  } catch (err: any) {
    console.error('Google Auth Route Error:', err)
    return apiError(err.message || 'Google authentication failed', 500)
  }
}
