import nodemailer from 'nodemailer'
import { prisma } from './prisma'

function cleanEnv(val?: string) {
  if (!val) return ''
  return val.replace(/["'\r\n\t]/g, '').trim()
}

function getTransporter() {
  const user = cleanEnv(process.env.SMTP_USER)
  const pass = cleanEnv(process.env.SMTP_PASS)
  const host = cleanEnv(process.env.SMTP_HOST) || 'smtp.gmail.com'
  const rawPort = cleanEnv(process.env.SMTP_PORT) || '465'
  const port = parseInt(rawPort, 10) || 465

  if (user && pass) {
    return {
      transporter: nodemailer.createTransport({
        host,
        port: port === 465 ? 465 : port,
        secure: port === 465,
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: { rejectUnauthorized: false }
      }),
      isLive: true
    }
  }

  // Fallback dev logger with clean console output
  return {
    transporter: {
      sendMail: async (options: nodemailer.SendMailOptions) => {
        console.log('─────────────────────────────────────────────────────────────────')
        console.log('📧 [DROPLYNC EMAIL ENGINE - LOCAL DEV MODE]')
        console.log(`To: ${options.to}`)
        console.log(`Subject: ${options.subject}`)
        console.log('─────────────────────────────────────────────────────────────────')
        return { messageId: 'dev-mail-' + Date.now() }
      }
    },
    isLive: false
  }
}

const DEFAULT_FROM = cleanEnv(process.env.SMTP_FROM) || (cleanEnv(process.env.SMTP_USER) ? `DropLync <${cleanEnv(process.env.SMTP_USER)}>` : 'DropLync <noreply@droplync.com>')

export async function sendOtpEmail(email: string, otp: string, type: string = 'auth') {
  const { transporter, isLive } = getTransporter()
  const title = type === 'register' ? 'Verify Your DropLync Account' : 'Your DropLync Sign In Code'
  const actionText = type === 'register' ? 'complete your registration' : 'sign in to your account'
  const subject = `${otp} is your DropLync verification code`

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f1d; color: #f8fafc; margin: 0; padding: 40px 20px; }
        .card { max-width: 500px; margin: 0 auto; background: #121829; border: 1px solid #1e293b; border-radius: 20px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .logo { text-align: center; margin-bottom: 24px; }
        .logo span { font-size: 24px; font-weight: 900; color: #3b82f6; letter-spacing: -0.5px; }
        .title { font-size: 20px; font-weight: 800; text-align: center; margin-bottom: 8px; color: #f8fafc; }
        .subtitle { font-size: 14px; color: #94a3b8; text-align: center; margin-bottom: 28px; line-height: 1.5; }
        .otp-box { background: #1e293b; border: 2px dashed #3b82f6; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 28px; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 10px; color: #60a5fa; margin: 0; }
        .footer { font-size: 12px; color: #64748b; text-align: center; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">
          <span>⚡ DropLync</span>
        </div>
        <div class="title">${title}</div>
        <div class="subtitle">Use the verification code below to ${actionText}. This code is valid for <strong>10 minutes</strong>.</div>
        
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
        </div>

        <div class="footer">
          If you didn't request this email, you can safely ignore it. Never share your verification code with anyone.<br><br>
          © 2026 DropLync Cloud Storage Inc. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `

  const text = `Your DropLync verification code is: ${otp}\n\nValid for 10 minutes. Do not share this code with anyone.`

  try {
    const info = await transporter.sendMail({
      from: DEFAULT_FROM,
      to: email,
      subject,
      text,
      html
    })

    // Record in Prisma Database
    try {
      await prisma.emailLog.create({
        data: {
          recipient: email.toLowerCase().trim(),
          sender: DEFAULT_FROM,
          subject,
          type: `otp_${type}`,
          status: isLive ? 'sent' : 'logged_dev',
          metadata: JSON.stringify({ code: otp, type, messageId: (info as any)?.messageId })
        }
      })
    } catch (dbErr) {
      console.warn('Failed to log email in DB:', dbErr)
    }

    return { success: true, info }
  } catch (err: any) {
    console.error(`[SMTP Error] Failed to send to ${email}:`, err)
    throw new Error(`Email dispatch failed: ${err.message || 'SMTP Connection Error'}`)
  }
}

export async function sendTransferEmail(params: {
  to: string[]
  from: string
  downloadUrl: string
  transferId?: string
  transferName?: string
  totalFiles: number
  totalSizeFormatted: string
  expiresAt: Date
  message?: string
  hasPassword?: boolean
}) {
  const { transporter, isLive } = getTransporter()
  const { to, from, downloadUrl, transferId, transferName, totalFiles, totalSizeFormatted, expiresAt, message, hasPassword } = params

  const expiresFormatted = new Date(expiresAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f1d; color: #f8fafc; margin: 0; padding: 40px 20px; }
        .card { max-width: 540px; margin: 0 auto; background: #121829; border: 1px solid #1e293b; border-radius: 24px; padding: 36px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
        .logo { text-align: center; margin-bottom: 24px; }
        .logo span { font-size: 24px; font-weight: 900; color: #3b82f6; letter-spacing: -0.5px; }
        .title { font-size: 22px; font-weight: 800; text-align: center; margin-bottom: 8px; color: #f8fafc; }
        .subtitle { font-size: 14px; color: #94a3b8; text-align: center; margin-bottom: 24px; line-height: 1.5; }
        .meta-pill { display: inline-block; background: #1e293b; border: 1px solid #334155; border-radius: 30px; padding: 6px 16px; font-size: 13px; color: #94a3b8; margin: 0 4px 10px; }
        .meta-container { text-align: center; margin-bottom: 20px; }
        .message-box { background: rgba(59, 130, 246, 0.08); border-left: 3px solid #3b82f6; border-radius: 8px; padding: 14px 18px; margin-bottom: 28px; font-size: 14px; color: #cbd5e1; font-style: italic; }
        .btn { display: block; text-align: center; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff !important; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 15px; text-decoration: none; box-shadow: 0 10px 25px rgba(37,99,235,0.4); margin-bottom: 24px; }
        .footer { font-size: 12px; color: #64748b; text-align: center; line-height: 1.5; border-top: 1px solid #1e293b; padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="logo">
          <span>⚡ DropLync</span>
        </div>
        <div class="title">${from} sent you files</div>
        <div class="subtitle">${totalFiles} file${totalFiles > 1 ? 's' : ''} (${totalSizeFormatted}) are ready to download via DropLync.</div>

        <div class="meta-container">
          <span class="meta-pill">📦 ${totalFiles} file${totalFiles > 1 ? 's' : ''}</span>
          <span class="meta-pill">⚡ ${totalSizeFormatted}</span>
          <span class="meta-pill">⏳ Expires ${expiresFormatted}</span>
          ${hasPassword ? '<span class="meta-pill" style="color: #60a5fa; border-color: #3b82f6;">🔒 Password Protected</span>' : ''}
        </div>

        ${message ? `<div class="message-box">"${message}"</div>` : ''}

        <a href="${downloadUrl}" class="btn">Download Files (${totalSizeFormatted}) →</a>

        <div class="footer">
          Files are transferred with end-to-end encryption. Links automatically purge upon expiration.<br><br>
          © 2026 DropLync Cloud Storage Inc. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `

  try {
    for (const recipient of to) {
      const subject = `${from} sent you files (${totalSizeFormatted}) via DropLync`
      await transporter.sendMail({
        from: DEFAULT_FROM,
        to: recipient.trim(),
        subject,
        text: `${from} sent you files via DropLync.\nDownload here: ${downloadUrl}\nTotal size: ${totalSizeFormatted}\nExpires: ${expiresFormatted}`,
        html
      })

      try {
        await prisma.emailLog.create({
          data: {
            recipient: recipient.toLowerCase().trim(),
            sender: from,
            subject,
            type: 'transfer_notification',
            status: isLive ? 'sent' : 'logged_dev',
            transferId: transferId || undefined,
            metadata: JSON.stringify({ downloadUrl, totalFiles, totalSizeFormatted })
          }
        })
      } catch (dbErr) {}
    }

    return { success: true }
  } catch (err: any) {
    console.error(`[SMTP Error] Transfer notification email failed: ${err.message}`)
    throw new Error(`Failed to send transfer email: ${err.message || 'SMTP Connection Error'}`)
  }
}
