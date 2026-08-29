import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, checkRateLimit, anonymizeIp } from '@/lib/utils'
import { verifyTransferToken } from '@/lib/tokens'
import { UPLOAD_DIR, getStoragePath } from '@/lib/storage'
import bcrypt from 'bcryptjs'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  req: NextRequest,
  { params }: { params: { token: string; fileId: string } }
) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`download:${ip}`, 40, 60000)) return apiError('Too many requests', 429)

  try {
    let transfer = await prisma.transfer.findFirst({
      where: {
        OR: [
          { token: params.token },
          { customSlug: params.token }
        ]
      },
      include: { files: { where: { id: params.fileId } } }
    })

    let file = transfer?.files[0]
    let filePath: string | null = file?.storagePath || null

    // If not found in local DB (Serverless DB isolation), verify signed token and locate file directly on disk
    if (!transfer || !file || !filePath || !fs.existsSync(filePath)) {
      const verified = verifyTransferToken(params.token)
      if (verified) {
        transfer = {
          id: verified.transferId,
          token: params.token,
          isActive: true,
          expiresAt: new Date(verified.expiresAt),
          maxDownloads: null,
          downloadCount: 0,
          passwordHash: null
        } as any

        const transferDir = path.join(UPLOAD_DIR, 'files', verified.transferId)
        if (fs.existsSync(transferDir)) {
          const filesInDir = await fs.promises.readdir(transferDir)
          const targetFilename = filesInDir.find(f => f.startsWith(params.fileId) || path.parse(f).name === params.fileId) || filesInDir[0]
          if (targetFilename) {
            filePath = path.join(transferDir, targetFilename)
            file = {
              id: params.fileId,
              originalName: targetFilename,
              mimeType: 'application/octet-stream',
              storagePath: filePath
            } as any
          }
        }
      }
    }

    if (!transfer || !transfer.isActive) return apiError('Transfer not found', 404)
    if (transfer.expiresAt < new Date()) return apiError('Transfer expired', 410)
    if (transfer.maxDownloads && transfer.downloadCount >= transfer.maxDownloads) {
      return apiError('Download limit reached', 410)
    }

    // Password check via header
    if (transfer.passwordHash) {
      const pw = req.headers.get('x-transfer-password')
      if (!pw) return apiError('Password required', 401)
      const valid = await bcrypt.compare(pw, transfer.passwordHash)
      if (!valid) return apiError('Incorrect password', 401)
    }

    if (!filePath || !fs.existsSync(filePath)) {
      return apiError('File not found on storage', 404)
    }

    const stat = fs.statSync(filePath)
    const fileSize = stat.size
    const originalName = file?.originalName || path.basename(filePath)
    const mimeType = file?.mimeType || 'application/octet-stream'

    // Non-blocking download log and count update
    try {
      prisma.downloadLog.create({
        data: {
          transferId: transfer.id,
          fileId: params.fileId,
          ipAddress: anonymizeIp(ip),
          userAgent: req.headers.get('user-agent') || ''
        }
      }).catch(() => {})

      prisma.transferFile.update({ where: { id: params.fileId }, data: { downloadCount: { increment: 1 } } }).catch(() => {})
      prisma.transfer.update({ where: { id: transfer.id }, data: { downloadCount: { increment: 1 } } }).catch(() => {})
    } catch {}

    // Support Range requests for resumable downloads of large files
    const rangeHeader = req.headers.get('range')
    let start = 0
    let end = fileSize - 1
    let status = 200
    const headers: Record<string, string> = {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(originalName)}"`,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    }

    if (rangeHeader) {
      const match = rangeHeader.match(/bytes=(\d+)-(\d*)/)
      if (match) {
        start = parseInt(match[1], 10)
        end = match[2] ? parseInt(match[2], 10) : fileSize - 1
        if (start >= fileSize || end >= fileSize) {
          return new Response(null, {
            status: 416,
            headers: { 'Content-Range': `bytes */${fileSize}` }
          })
        }
        status = 206
        headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`
      }
    }

    headers['Content-Length'] = (end - start + 1).toString()

    const nodeStream = fs.createReadStream(filePath, { start, end })

    let isClosed = false
    const webStream = new ReadableStream({
      start(controller) {
        nodeStream.on('data', (chunk: Buffer | string) => {
          if (isClosed) return
          try {
            const buf = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
            controller.enqueue(new Uint8Array(buf))
          } catch {
            isClosed = true
          }
        })
        nodeStream.on('end', () => {
          if (!isClosed) {
            isClosed = true
            try { controller.close() } catch {}
          }
        })
        nodeStream.on('error', (err) => {
          if (!isClosed) {
            isClosed = true
            try { controller.error(err) } catch {}
          }
        })
      },
      cancel() {
        isClosed = true
        nodeStream.destroy()
      }
    })

    return new Response(webStream, { status, headers })
  } catch (err: any) {
    console.error('File download route error:', err)
    return apiError('File not available', 404)
  }
}
