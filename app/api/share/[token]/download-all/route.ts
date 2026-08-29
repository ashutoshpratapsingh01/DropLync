import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, checkRateLimit, anonymizeIp } from '@/lib/utils'
import { verifyTransferToken } from '@/lib/tokens'
import { UPLOAD_DIR } from '@/lib/storage'
import bcrypt from 'bcryptjs'
import archiver from 'archiver'
import fs from 'fs'
import path from 'path'
import { PassThrough } from 'stream'

export const dynamic = 'force-dynamic'
export const maxDuration = 60
export const runtime = 'nodejs'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`download-all:${ip}`, 10, 60000)) return apiError('Too many requests', 429)

  let transfer = await prisma.transfer.findFirst({
    where: {
      OR: [
        { token: params.token },
        { customSlug: params.token }
      ]
    },
    include: { files: true }
  })

  // If not found in local DB (Serverless DB isolation), verify signed token and locate files on disk
  let validFiles: { originalName: string; storagePath: string; relativePath?: string | null }[] = []

  if (!transfer) {
    const verified = verifyTransferToken(params.token)
    if (verified) {
      const transferDir = path.join(UPLOAD_DIR, 'files', verified.transferId)
      if (fs.existsSync(transferDir)) {
        try {
          const diskFiles = await fs.promises.readdir(transferDir)
          for (const df of diskFiles) {
            const filePath = path.join(transferDir, df)
            if (fs.existsSync(filePath)) {
              validFiles.push({
                originalName: df,
                storagePath: filePath,
                relativePath: df
              })
            }
          }
          transfer = {
            id: verified.transferId,
            token: params.token,
            isActive: true,
            expiresAt: new Date(verified.expiresAt),
            maxDownloads: null,
            downloadCount: 0,
            passwordHash: null,
            name: verified.name || 'Transfer'
          } as any
        } catch (e) {
          console.warn('Disk file reading warning for download-all:', e)
        }
      }
    }
  } else {
    validFiles = transfer.files.filter(
      file => file.storagePath && fs.existsSync(file.storagePath)
    ) as any
  }

  if (!transfer || !transfer.isActive) return apiError('Transfer not found', 404)
  if (transfer.expiresAt < new Date()) return apiError('Transfer expired', 410)
  if (transfer.maxDownloads && transfer.downloadCount >= transfer.maxDownloads) {
    return apiError('Download limit reached', 410)
  }

  if (transfer.passwordHash) {
    const pw = req.headers.get('x-transfer-password')
    if (!pw) return apiError('Password required', 401)
    const valid = await bcrypt.compare(pw, transfer.passwordHash)
    if (!valid) return apiError('Incorrect password', 401)
  }

  if (validFiles.length === 0) {
    return apiError('No downloadable files found in this transfer', 404)
  }

  // Log bulk download
  try {
    prisma.downloadLog.create({
      data: {
        transferId: transfer.id,
        ipAddress: anonymizeIp(ip),
        userAgent: req.headers.get('user-agent') || ''
      }
    }).catch(() => {})

    prisma.transfer.update({
      where: { id: transfer.id },
      data: { downloadCount: { increment: 1 } }
    }).catch(() => {})
  } catch {}

  const passThrough = new PassThrough()
  const archive = archiver('zip', {
    zlib: { level: 1 },
    highWaterMark: 1024 * 1024
  })

  archive.on('error', (err) => {
    try { passThrough.destroy(err) } catch {}
  })

  archive.on('warning', (err) => {
    if (err.code !== 'ENOENT') {
      try { passThrough.destroy(err) } catch {}
    }
  })

  archive.pipe(passThrough)

  for (const file of validFiles) {
    const entryName = (file as any).relativePath || file.originalName
    archive.file(file.storagePath, { name: entryName })
  }

  const webStream = new ReadableStream({
    start(controller) {
      passThrough.on('error', (err) => {
        try { controller.error(err) } catch {}
      })
    },
    pull(controller) {
      return new Promise<void>((resolve) => {
        const chunk = passThrough.read()
        if (chunk !== null) {
          controller.enqueue(new Uint8Array(chunk))
          resolve()
        } else {
          const onReadable = () => {
            passThrough.removeListener('readable', onReadable)
            passThrough.removeListener('end', onEnd)
            const newChunk = passThrough.read()
            if (newChunk !== null) {
              controller.enqueue(new Uint8Array(newChunk))
            }
            resolve()
          }
          const onEnd = () => {
            passThrough.removeListener('readable', onReadable)
            passThrough.removeListener('end', onEnd)
            try { controller.close() } catch {}
            resolve()
          }
          passThrough.once('readable', onReadable)
          passThrough.once('end', onEnd)
        }
      })
    },
    cancel() {
      try { passThrough.destroy() } catch {}
      try { archive.abort() } catch {}
    }
  })

  archive.finalize().catch((err) => {
    console.error('Archiver finalize error:', err)
  })

  const zipFilename = `${(transfer.name || 'DropLync_Files').replace(/[/\\?%*:|"<>]/g, '_')}.zip`

  return new Response(webStream, {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(zipFilename)}"`,
      'Cache-Control': 'no-store',
    }
  })
}
