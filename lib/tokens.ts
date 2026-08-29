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
