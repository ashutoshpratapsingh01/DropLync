import fs from 'fs'
import net from 'net'
import path from 'path'

// Known executable and hazardous magic numbers (Fast First-Pass Filter)
const HAZARDOUS_MAGIC_HEADERS = [
  { name: 'Windows PE Executable (EXE/DLL)', bytes: [0x4D, 0x5A] }, // MZ
  { name: 'Linux ELF Executable', bytes: [0x7F, 0x45, 0x4C, 0x46] }, // .ELF
  { name: 'macOS Mach-O Binary (32-bit)', bytes: [0xFE, 0xED, 0xFA, 0xCE] },
  { name: 'macOS Mach-O Binary (64-bit)', bytes: [0xFE, 0xED, 0xFA, 0xCF] },
  { name: 'macOS Universal Binary', bytes: [0xCA, 0xFE, 0xBA, 0xBE] },
  { name: 'Compiled Windows Help File (CHM)', bytes: [0x49, 0x54, 0x53, 0x46] }, // ITSF
]

// EICAR standard anti-malware test signature
const EICAR_SIGNATURE = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'

export interface ScanResult {
  isSafe: boolean
  threatName?: string
  scanner: 'content_heuristics' | 'clamav'
  details?: string
  fallbackBypass?: boolean
}

/**
 * Pings the ClamAV daemon over TCP to verify daemon liveness
 */
export async function pingClamAv(host: string, port: number, timeoutMs = 3000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(timeoutMs)

    socket.on('connect', () => {
      socket.write('zPING\0')
    })

    socket.on('data', (data) => {
      const resp = data.toString('utf8').trim()
      socket.destroy()
      resolve(resp.includes('PONG'))
    })

    socket.on('timeout', () => {
      socket.destroy()
      resolve(false)
    })

    socket.on('error', () => {
      socket.destroy()
      resolve(false)
    })

    socket.connect(port, host)
  })
}

/**
 * Streams file content to ClamAV daemon via the standard INSTREAM TCP protocol.
 * Chunk format: [4 bytes Big-Endian length][chunk data] ... [0x00, 0x00, 0x00, 0x00]
 */
export async function scanWithClamAvStream(
  filePathOrBuffer: string | Buffer,
  host: string,
  port: number,
  timeoutMs = 30000
): Promise<{ isSafe: boolean; threatName?: string; rawResponse?: string }> {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket()
    let responseData = ''
    let isResolved = false

    const timer = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        socket.destroy()
        reject(new Error(`ClamAV scan timed out after ${timeoutMs}ms`))
      }
    }, timeoutMs)

    function finish(result: { isSafe: boolean; threatName?: string; rawResponse?: string }) {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timer)
        socket.destroy()
        resolve(result)
      }
    }

    socket.on('connect', async () => {
      try {
        // Send INSTREAM command with null delimiter
        socket.write('zINSTREAM\0')

        if (typeof filePathOrBuffer === 'string') {
          // Stream file from disk in 64KB chunks to keep memory usage minimal
          const readStream = fs.createReadStream(filePathOrBuffer, { highWaterMark: 64 * 1024 })

          readStream.on('data', (chunk: Buffer | string) => {
            const chunkBuf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
            const sizeBuf = Buffer.alloc(4)
            sizeBuf.writeUInt32BE(chunkBuf.length, 0)
            socket.write(sizeBuf)
            socket.write(chunkBuf)
          })


          readStream.on('end', () => {
            // Send 4 bytes of 0 to indicate EOF
            const eofBuf = Buffer.alloc(4, 0)
            socket.write(eofBuf)
          })

          readStream.on('error', (err) => {
            clearTimeout(timer)
            socket.destroy()
            reject(err)
          })
        } else {
          // Stream buffer in chunks
          const chunkSize = 64 * 1024
          let offset = 0
          while (offset < filePathOrBuffer.length) {
            const currentChunk = filePathOrBuffer.subarray(offset, offset + chunkSize)
            const sizeBuf = Buffer.alloc(4)
            sizeBuf.writeUInt32BE(currentChunk.length, 0)
            socket.write(sizeBuf)
            socket.write(currentChunk)
            offset += chunkSize
          }
          const eofBuf = Buffer.alloc(4, 0)
          socket.write(eofBuf)
        }
      } catch (err) {
        clearTimeout(timer)
        socket.destroy()
        reject(err)
      }
    })

    socket.on('data', (data) => {
      responseData += data.toString('utf8')
    })

    socket.on('end', () => {
      const trimmed = responseData.trim()
      if (trimmed.includes('FOUND')) {
        // Example: "stream: Eicar-Signature FOUND" or "stream: Win.Test.EICAR_HDB-1 FOUND"
        const match = trimmed.match(/stream:\s*(.+)\s+FOUND/i)
        const threat = match ? match[1] : 'ClamAV.DetectedThreat'
        finish({ isSafe: false, threatName: threat, rawResponse: trimmed })
      } else if (trimmed.includes('OK')) {
        finish({ isSafe: true, rawResponse: trimmed })
      } else {
        finish({ isSafe: false, threatName: `ClamAV-Error:${trimmed}`, rawResponse: trimmed })
      }
    })

    socket.on('error', (err) => {
      if (!isResolved) {
        isResolved = true
        clearTimeout(timer)
        socket.destroy()
        reject(err)
      }
    })

    socket.connect(port, host)
  })
}

/**
 * Inspects buffer or file content for malware.
 * 1. Executes first-pass heuristic and header inspection.
 * 2. If ClamAV host is configured, streams the file to ClamAV daemon.
 * 3. Applies explicit fallback policy (fail_closed vs fail_open) if ClamAV daemon is unreachable.
 */
export async function scanFileContent(filePathOrBuffer: string | Buffer, originalFilename?: string): Promise<ScanResult> {
  let buffer: Buffer

  if (typeof filePathOrBuffer === 'string') {
    if (!fs.existsSync(filePathOrBuffer)) {
      return { isSafe: true, scanner: 'content_heuristics' }
    }
    // Read first 64KB for initial fast structural check
    const fd = await fs.promises.open(filePathOrBuffer, 'r')
    const tempBuf = Buffer.alloc(65536)
    const { bytesRead } = await fd.read(tempBuf, 0, 65536, 0)
    await fd.close()
    buffer = tempBuf.subarray(0, bytesRead)
  } else {
    buffer = filePathOrBuffer
  }

  // =========================================================================
  // STEP 1: FAST FIRST-PASS FILTER (Magic Bytes & Synthetic EICAR Detection)
  // =========================================================================
  if (buffer.length > 0) {
    const bufferString = buffer.toString('latin1')

    if (bufferString.includes(EICAR_SIGNATURE)) {
      return {
        isSafe: false,
        threatName: 'EICAR-Test-Signature',
        scanner: 'content_heuristics',
        details: 'Standard anti-malware test signature detected in file content.'
      }
    }

    for (const sig of HAZARDOUS_MAGIC_HEADERS) {
      if (buffer.length >= sig.bytes.length) {
        let matches = true
        for (let i = 0; i < sig.bytes.length; i++) {
          if (buffer[i] !== sig.bytes[i]) {
            matches = false
            break
          }
        }
        if (matches) {
          return {
            isSafe: false,
            threatName: `ExecutableBinary:${sig.name}`,
            scanner: 'content_heuristics',
            details: `Dangerous executable binary header detected (${sig.name}). Executables are blocked.`
          }
        }
      }
    }

    const normalizedText = bufferString.slice(0, 4096).toLowerCase()
    if (
      normalizedText.includes('<?php') ||
      normalizedText.includes('eval(base64_decode') ||
      normalizedText.includes('system($_get') ||
      normalizedText.includes('passthru($_post') ||
      normalizedText.includes('<%@ page language=') ||
      (normalizedText.startsWith('#!/bin/sh') && originalFilename && !originalFilename.endsWith('.sh'))
    ) {
      return {
        isSafe: false,
        threatName: 'DangerousScriptPayload',
        scanner: 'content_heuristics',
        details: 'Unsafe web shell or executable script payload detected in uploaded file content.'
      }
    }
  }

  // =========================================================================
  // STEP 2: AUTHORITATIVE CLAMAV DAEMON STREAM SCANNING
  // =========================================================================
  const clamHost = process.env.CLAMAV_HOST
  const clamPort = parseInt(process.env.CLAMAV_PORT || '3310', 10)
  const clamTimeout = parseInt(process.env.CLAMAV_TIMEOUT_MS || '30000', 10)
  const fallbackMode = (process.env.CLAMAV_FALLBACK_MODE || 'fail_closed').toLowerCase()

  if (clamHost) {
    try {
      const clamResult = await scanWithClamAvStream(filePathOrBuffer, clamHost, clamPort, clamTimeout)
      if (!clamResult.isSafe) {
        return {
          isSafe: false,
          threatName: clamResult.threatName || 'ClamAV.ThreatDetected',
          scanner: 'clamav',
          details: `ClamAV signature engine detected malicious content: ${clamResult.threatName}`
        }
      }
      return {
        isSafe: true,
        scanner: 'clamav'
      }
    } catch (err: any) {
      console.warn(`[AV WARNING] ClamAV daemon scan error on ${clamHost}:${clamPort}:`, err.message)

      if (fallbackMode === 'fail_open') {
        // Fail-open policy: log bypass warning and allow upload based on first-pass result
        console.warn(`[AV BYPASS - clamd unavailable] Allowing file "${originalFilename || 'unnamed'}" through with first-pass heuristic inspection only.`)
        return {
          isSafe: true,
          scanner: 'content_heuristics',
          fallbackBypass: true,
          details: 'ClamAV daemon was unreachable; file permitted under fail_open policy.'
        }
      } else {
        // Fail-closed policy (default & recommended): reject upload when scanner is down
        return {
          isSafe: false,
          threatName: 'ClamAV-Unavailable-ScanFailed',
          scanner: 'clamav',
          details: `Antivirus daemon is unreachable (${err.message}) and CLAMAV_FALLBACK_MODE is set to fail_closed.`
        }
      }
    }
  }

  return {
    isSafe: true,
    scanner: 'content_heuristics'
  }
}
