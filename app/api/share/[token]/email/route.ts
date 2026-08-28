import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess, formatBytes, checkRateLimit } from '@/lib/utils'
import { sendTransferEmail } from '@/lib/mail'

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`share-email:${ip}`, 10, 60000)) {
    return apiError('Too many email notifications sent. Please wait a minute before sending more.', 429)
  }

  try {

    const { token } = params
    const body = await req.json()
    const { recipientEmails, senderEmail, message } = body

    if (!recipientEmails) {
      return apiError('Recipient email address is required')
    }

    if (!senderEmail || !senderEmail.includes('@')) {
      return apiError('Valid sender email address is required')
    }

    const recipients: string[] = Array.isArray(recipientEmails)
      ? recipientEmails.map((e: string) => e.trim().toLowerCase()).filter(Boolean)
      : recipientEmails.split(',').map((e: string) => e.trim().toLowerCase()).filter(Boolean)

    if (recipients.length === 0) {
      return apiError('At least one valid recipient email is required')
    }

    const transfer = await prisma.transfer.findUnique({
      where: { token },
      include: { files: true }
    })

    if (!transfer) {
      return apiError('Transfer session not found', 404)
    }

    const origin = req.headers.get('origin') || req.nextUrl.origin || 'http://localhost:3000'
    const downloadUrl = `${origin}/f/${token}`
    const totalSizeFormatted = formatBytes(Number(transfer.totalSize))

    // Update transfer in Prisma
    await prisma.transfer.update({
      where: { id: transfer.id },
      data: {
        senderEmail: senderEmail.trim(),
        recipientEmails: recipients.join(', '),
        deliveryMode: 'email',
        emailMessage: message?.trim() || null
      }
    })

    await sendTransferEmail({
      to: recipients,
      from: senderEmail.trim(),
      downloadUrl,
      transferId: transfer.id,
      transferName: transfer.name || undefined,
      totalFiles: transfer.files.length,
      totalSizeFormatted,
      expiresAt: transfer.expiresAt,
      message: message?.trim() || undefined
    })

    return apiSuccess({
      message: `Transfer link sent to ${recipients.length} recipient${recipients.length > 1 ? 's' : ''}`,
      recipients
    })
  } catch (err: any) {
    console.error('Transfer Email Dispatch Error:', err)
    return apiError(err.message || 'Failed to send transfer email', 500)
  }
}
