import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, checkRateLimit, anonymizeIp } from '@/lib/utils'

import bcrypt from 'bcryptjs'
import archiver from 'archiver'
import fs from 'fs'
import { PassThrough } from 'stream'

export async function GET(req: NextRequest, { params }: { params: { token: string } }) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`download-all:${ip}`, 10, 60000)) return apiError('Too many requests', 429)

  const transfer = await prisma.transfer.findFirst({
    where: {
      OR: [
        { token: params.token },
        { customSlug: params.token }
      ]
    },
    include: { files: true }
  })


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

  // Filter to only files that actually exist on disk
  const validFiles = transfer.files.filter(
    file => file.storagePath && fs.existsSync(file.storagePath)
  )

  if (validFiles.length === 0) {
    return apiError('No downloadable files found in this transfer', 404)
  }

  // Log bulk download (fire-and-forget — don't block the stream)
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

  const passThrough = new PassThrough()
  const archive = archiver('zip', {
    zlib: { level: 1 }, // Use fast compression for large files — level 1 instead of 6
    highWaterMark: 1024 * 1024 // 1MB buffer for better throughput
  })

  // Handle archiver errors
  archive.on('error', (err) => {
    try { passThrough.destroy(err) } catch {}
  })

  archive.on('warning', (err) => {
    if (err.code !== 'ENOENT') {
      try { passThrough.destroy(err) } catch {}
    }
  })

  // Pipe archive → passThrough BEFORE adding files
  archive.pipe(passThrough)

  // Add all valid files to the archive (preserving relativePath folder hierarchy)
  for (const file of validFiles) {
    const entryName = (file as any).relativePath || file.originalName
    archive.file(file.storagePath, { name: entryName })
  }


  // Bridge PassThrough → Web ReadableStream with proper backpressure
  // Set up the ReadableStream BEFORE calling archive.finalize()
  // so we don't miss any early data events
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
          return
        }

        // No data available yet — wait for 'readable' or 'end'
        const onReadable = () => {
          cleanup()
          const data = passThrough.read()
          if (data !== null) {
            controller.enqueue(new Uint8Array(data))
          }
          resolve()
        }
        const onEnd = () => {
          cleanup()
          try { controller.close() } catch {}
          resolve()
        }
        const onError = (err: Error) => {
          cleanup()
          try { controller.error(err) } catch {}
          resolve()
        }
        const cleanup = () => {
          passThrough.removeListener('readable', onReadable)
          passThrough.removeListener('end', onEnd)
          passThrough.removeListener('error', onError)
        }

        passThrough.on('readable', onReadable)
        passThrough.on('end', onEnd)
        passThrough.on('error', onError)
      })
    },
    cancel() {
      archive.abort()
      passThrough.destroy()
    }
  })

  // NOW finalize the archive — after the ReadableStream is already listening
  archive.finalize()

  const zipName = (transfer.name || 'droplync-transfer').replace(/[^a-zA-Z0-9\-_]/g, '_')
  return new Response(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${zipName}.zip"`,
      'Cache-Control': 'no-store'
    }
  })
}
