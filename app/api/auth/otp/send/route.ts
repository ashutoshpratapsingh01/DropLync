import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOtpEmail } from '@/lib/mail'
import { checkRateLimit } from '@/lib/utils'
import { signOtpTicket } from '@/lib/tokens'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || 'unknown'
    if (!checkRateLimit(`otp-ip:${ip}`, 10, 60000)) {
      return NextResponse.json({ error: 'Too many verification requests. Please wait 60 seconds before trying again.' }, { status: 429 })
    }

    const { email, type = 'auth' } = await req.json()

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ error: 'Please provide a valid email address' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    if (!checkRateLimit(`otp-email:${normalizedEmail}`, 5, 60000)) {
      return NextResponse.json({ error: 'Too many verification codes requested for this email. Please wait 60 seconds.' }, { status: 429 })
    }

    // Check user state if user exists
    try {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      })
      if (existingUser && !existingUser.isActive) {
        return NextResponse.json({
          error: 'This account has been deactivated. Please contact support.'
        }, { status: 403 })
      }
    } catch (dbErr) {
      console.warn('DB check warning on otp send:', dbErr)
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store in DB if available
    try {
      await prisma.verificationToken.deleteMany({
        where: { email: normalizedEmail }
      })
      await prisma.verificationToken.create({
        data: {
          email: normalizedEmail,
          code,
          type,
          expiresAt
        }
      })
    } catch (dbErr) {
      console.warn('DB token store warning on otp send:', dbErr)
    }

    // Generate stateless cryptographically signed OTP ticket (prevents serverless lost token bugs)
    const otpToken = signOtpTicket({
      email: normalizedEmail,
      code,
      type,
      expiresAt
    })

    // Dispatch email
    await sendOtpEmail(normalizedEmail, code, type)

    const response = NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}`,
      otpToken,
      devCode: process.env.NODE_ENV !== 'production' ? code : undefined
    })

    response.cookies.set('otp_ticket', otpToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/'
    })

    return response
  } catch (err: any) {
    console.error('OTP Send Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to send verification code. Please check your email address and try again.' }, { status: 500 })
  }
}
