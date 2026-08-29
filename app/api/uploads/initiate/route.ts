import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/utils'
import { getStoragePath, ensureDir } from '@/lib/storage'
import { getMaxUploadLimitForUser } from '@/lib/plans'
import { signUploadTicket, verifyTransferToken, verifyUploadTicket } from '@/lib/tokens'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BLOCKED_TYPES = [
  'application/x-executable', 'application/x-msdownload',
  'application/x-sh', 'text/x-script'
]

export async function POST(req: NextRequest) {
  try {
    const { transferId, filename, relativePath, mimeType, size, totalChunks } = await req.json()

    if (!transferId || !filename || size === undefined || size === null) {
      return apiError('Missing required fields')
    }

    const fileSizeBigInt = BigInt(size)
    if (fileSizeBigInt <= BigInt(0)) {
      return apiError('File cannot be empty')
    }

    const clientUploadToken = req.headers.get('x-transfer-token') || ''
    let transfer = await prisma.transfer.findUnique({ where: { id: transferId } })

    // If transfer is not found in local instance DB (Serverless DB isolation), verify signed token fallback
    if (!transfer) {
      const verifiedPayload = verifyTransferToken(clientUploadToken) || verifyUploadTicket(clientUploadToken)
      if (verifiedPayload && verifiedPayload.transferId === transferId) {
        try {
          transfer = await prisma.transfer.upsert({
            where: { id: transferId },
            update: {},
            create: {
              id: transferId,
              token: clientUploadToken,
              uploadToken: clientUploadToken,
              name: (verifiedPayload as any).name || `Transfer ${new Date().toLocaleDateString()}`,
              userId: (verifiedPayload as any).userId ?? null,
              expiresAt: new Date((verifiedPayload as any).expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000),
              totalSize: BigInt(0),
              isActive: true
            }
          })
        } catch (e) {
          console.warn('Upsert fallback transfer warning:', e)
        }
      }
    }

    if (!transfer || !transfer.isActive) {
      return apiError('Transfer session not found or inactive', 404)
    }

    // Verify transfer authorization token
    const validToken = transfer.uploadToken || transfer.token
    const isTokenValid = clientUploadToken === validToken ||
      verifyTransferToken(clientUploadToken) !== null ||
      verifyUploadTicket(clientUploadToken) !== null

    if (!isTokenValid) {
      return apiError('Unauthorized: Missing or invalid transfer upload token', 401)
    }

    // Determine user plan limit
    let userPlan = 'free'
    if (transfer.userId) {
      const user = await prisma.user.findUnique({ where: { id: transfer.userId } })
      if (user) userPlan = (user as any).plan || 'free'
    }

    const planLimit = getMaxUploadLimitForUser(userPlan)
    if (fileSizeBigInt > planLimit.maxBytes) {
      return apiError(
        `Upload exceeds the ${planLimit.planName} limit of ${planLimit.maxDisplay}. Free tier supports up to 10GB. Upgrade your plan to transfer larger files.`,
        403
      )
    }

    if (mimeType && BLOCKED_TYPES.includes(mimeType)) {
      return apiError('File type is not permitted for security reasons')
    }

    const fileId = uuidv4()
    const sanitizedName = filename.replace(/[/\\?%*:|"<>]/g, '_').trim() || `file_${fileId.slice(0, 8)}`
    const storagePath = getStoragePath(transferId, fileId, sanitizedName)

    // Pre-create storage directory
    await ensureDir(path.dirname(storagePath))

    try {
      await prisma.transferFile.create({
        data: {
          id: fileId,
          transferId,
          originalName: sanitizedName,
          relativePath: typeof relativePath === 'string' ? relativePath.trim() : null,
          storagePath: storagePath,
          mimeType: mimeType || 'application/octet-stream',
          size: fileSizeBigInt
        }
      })
    } catch (dbErr) {
      console.warn('TransferFile create warning:', dbErr)
    }

    // Generate signed upload ticket for this specific file
    const fileUploadToken = signUploadTicket({
      transferId,
      fileId,
      filename: sanitizedName,
      size: Number(fileSizeBigInt),
      mimeType: mimeType || 'application/octet-stream',
      totalChunks: Number(totalChunks) || 1,
      expiresAt: transfer.expiresAt.toISOString()
    })

    return apiSuccess({
      fileId,
      storagePath,
      uploadToken: fileUploadToken,
      chunkSize: 3 * 1024 * 1024 // 3MB chunk size (fits Vercel 4.5MB payload limit)
    }, 201)
  } catch (error: any) {
    console.error('Initiate error:', error)
    return apiError(error?.message || 'Failed to initiate file upload', 500)
  }
}
