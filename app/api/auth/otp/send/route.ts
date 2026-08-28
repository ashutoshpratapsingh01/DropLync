import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendOtpEmail } from '@/lib/mail'
import { checkRateLimit } from '@/lib/utils'

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

    // If type is 'register', check if account already exists
    if (type === 'register') {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      })
      if (existingUser) {
        return NextResponse.json({
          error: 'An account with this email already exists. Please sign in instead.'
        }, { status: 409 })
      }
    }

    // If type is 'login', check if account exists
    if (type === 'login') {
      const existingUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      })
      if (!existingUser) {
        return NextResponse.json({
          error: 'No account found with this email. Please create a free account first.'
        }, { status: 404 })
      }
      if (!existingUser.isActive) {
        return NextResponse.json({
          error: 'This account has been deactivated. Please contact support.'
        }, { status: 403 })
      }
    }

    // Generate random 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Delete any existing unused OTPs for this email
    await prisma.verificationToken.deleteMany({
      where: { email: normalizedEmail }
    })

    // Store new OTP in database
    await prisma.verificationToken.create({
      data: {
        email: normalizedEmail,
        code,
        type,
        expiresAt
      }
    })

    // Dispatch email
    const mailResult = await sendOtpEmail(normalizedEmail, code, type)

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been sent to ${normalizedEmail}`,
      devCode: code // Auto-fills in development for immediate testing
    })
  } catch (err: any) {
    console.error('OTP Send Error:', err)
    return NextResponse.json({ error: err.message || 'Failed to send verification code. Please check your email address and try again.' }, { status: 500 })
  }
}
