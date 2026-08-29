import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'droplync-super-secret-jwt-key-change-in-production-min-32-chars'

export interface TransferPayload {
  transferId: string
  token: string
  name?: string
  expiresAt: string
  userId?: string | null
}

export interface UploadTicketPayload {
  transferId: string
  fileId: string
  filename: string
  size: number
  mimeType?: string
  totalChunks?: number
  expiresAt?: string
}

export interface OtpTicketPayload {
  email: string
  codeHash: string
  type: string
  expiresAt: string
}

import crypto from 'crypto'

export function hashOtpCode(code: string): string {
  return crypto.createHash('sha256').update(code.trim()).digest('hex')
}

export function signOtpTicket(payload: { email: string; code: string; type?: string; expiresAt?: Date }): string {
  const normalizedEmail = payload.email.toLowerCase().trim()
  const codeHash = hashOtpCode(payload.code)
  const exp = payload.expiresAt ? payload.expiresAt.toISOString() : new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const data: OtpTicketPayload = {
    email: normalizedEmail,
    codeHash,
    type: payload.type || 'auth',
    expiresAt: exp
  }

  return jwt.sign(data, JWT_SECRET, { expiresIn: '15m' })
}

export function verifyOtpTicket(ticket: string, email: string, inputCode: string): { valid: boolean; reason?: string } {
  try {
    const payload = jwt.verify(ticket, JWT_SECRET) as OtpTicketPayload
    if (!payload || !payload.email || !payload.codeHash) {
      return { valid: false, reason: 'Invalid OTP ticket payload' }
    }

    const normalizedEmail = email.toLowerCase().trim()
    if (payload.email !== normalizedEmail) {
      return { valid: false, reason: 'Email mismatch on OTP ticket' }
    }

    if (new Date(payload.expiresAt).getTime() < Date.now()) {
      return { valid: false, reason: 'OTP code has expired' }
    }

    const inputHash = hashOtpCode(inputCode)
    if (payload.codeHash !== inputHash) {
      return { valid: false, reason: 'Incorrect verification code' }
    }

    return { valid: true }
  } catch (err: any) {
    return { valid: false, reason: err.message || 'Invalid or expired OTP ticket' }
  }
}

export function signTransferToken(payload: TransferPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' })
}

export function verifyTransferToken(tokenString: string): TransferPayload | null {
  try {
    return jwt.verify(tokenString, JWT_SECRET) as TransferPayload
  } catch {
    return null
  }
}

export function signUploadTicket(payload: UploadTicketPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyUploadTicket(ticketString: string): UploadTicketPayload | null {
  try {
    return jwt.verify(ticketString, JWT_SECRET) as UploadTicketPayload
  } catch {
    return null
  }
}
