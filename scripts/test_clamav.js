const net = require('net')
const fs = require('fs')
const path = require('path')
const { pingClamAv, scanWithClamAvStream, scanFileContent } = require('../lib/scanner')

const TEST_PORT = 3319
const TEST_HOST = '127.0.0.1'

/**
 * Starts a standards-compliant ClamAV TCP daemon server for local test verification.
 * Implements PING, INSTREAM (4-byte BE length chunking), and threat reporting.
 */
function startMockClamAvDaemon(port) {
  const server = net.createServer((socket) => {
    let mode = 'IDLE' // IDLE | INSTREAM
    let streamChunks = []

    socket.on('data', (data) => {
      if (mode === 'IDLE') {
        const cmd = data.toString('utf8')
        if (cmd.includes('PING')) {
          socket.write('PONG\0')
          socket.end()
          return
        }
        if (cmd.includes('INSTREAM')) {
          mode = 'INSTREAM'
          // Process any payload data that arrived in the same TCP packet after the command
          const cmdIndex = data.indexOf(0x00) // null terminator
          if (cmdIndex !== -1 && cmdIndex + 1 < data.length) {
            data = data.subarray(cmdIndex + 1)
          } else {
            return
          }
        }
      }

      if (mode === 'INSTREAM') {
        let offset = 0
        while (offset + 4 <= data.length) {
          const chunkSize = data.readUInt32BE(offset)
          offset += 4

          if (chunkSize === 0) {
            // EOF chunk (4 bytes of 0)
            const fullBuffer = Buffer.concat(streamChunks)
            const content = fullBuffer.toString('latin1')

            if (content.includes('EICAR') || content.includes('X5O!P%@AP')) {
              socket.write('stream: Win.Test.EICAR_HDB-1 FOUND\0')
            } else if (content.includes('MALICIOUS_TROJAN_TEST_VIRUS')) {
              socket.write('stream: Trojan.CustomTestPayload.Gen FOUND\0')
            } else {
              socket.write('stream: OK\0')
            }
            socket.end()
            return
          }

          if (offset + chunkSize <= data.length) {
            streamChunks.push(data.subarray(offset, offset + chunkSize))
            offset += chunkSize
          } else {
            // Partial packet remaining
            streamChunks.push(data.subarray(offset))
            break
          }
        }
      }
    })
  })

  return new Promise((resolve) => {
    server.listen(port, TEST_HOST, () => resolve(server))
  })
}

async function runClamAvTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 CLAMAV ANTIVIRUS DAEMON & INSTREAM PIPELINE VERIFICATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

  let passed = 0
  let total = 0

  function assert(condition, testName, details = '') {
    total++
    if (condition) {
      console.log(`✅ [PASS] ${testName}`)
      passed++
    } else {
      console.error(`❌ [FAIL] ${testName} - ${details}`)
    }
  }

  // 1. Start ClamAV Mock Daemon
  const daemon = await startMockClamAvDaemon(TEST_PORT)
  console.log(`[DAEMON] ClamAV TCP Daemon running on ${TEST_HOST}:${TEST_PORT}`)

  try {
    // --- TEST 1: Ping / Healthcheck ---
    const isAlive = await pingClamAv(TEST_HOST, TEST_PORT, 2000)
    assert(isAlive, 'Test 1: ClamAV TCP Healthcheck (PING -> PONG) succeeds', `alive=${isAlive}`)

    // --- TEST 2: Clean File Stream Inspection ---
    const cleanBuffer = Buffer.from('This is a completely safe, clean PDF report payload for testing.')
    const cleanScan = await scanWithClamAvStream(cleanBuffer, TEST_HOST, TEST_PORT, 5000)
    assert(
      cleanScan.isSafe && cleanScan.rawResponse?.includes('OK'),
      'Test 2: Clean multi-chunk payload streams via INSTREAM and passes ClamAV scan (stream: OK)',
      `isSafe=${cleanScan.isSafe}, resp=${cleanScan.rawResponse}`
    )

    // --- TEST 3: EICAR Anti-Malware Detection via ClamAV Stream ---
    const eicarBuffer = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')
    const eicarScan = await scanWithClamAvStream(eicarBuffer, TEST_HOST, TEST_PORT, 5000)
    assert(
      !eicarScan.isSafe && eicarScan.threatName?.includes('EICAR'),
      'Test 3: EICAR virus signature detected by ClamAV stream engine (Win.Test.EICAR_HDB-1 FOUND)',
      `isSafe=${eicarScan.isSafe}, threat=${eicarScan.threatName}`
    )

    // --- TEST 4: Large Multi-Chunk Streamed File Inspection ---
    const largeFile = path.resolve('storage/uploads/clamav_test_file.bin')
    fs.mkdirSync(path.dirname(largeFile), { recursive: true })
    fs.writeFileSync(largeFile, Buffer.concat([
      Buffer.alloc(200 * 1024, 'A'),
      Buffer.from('MALICIOUS_TROJAN_TEST_VIRUS_SIGNATURE_PAYLOAD'),
      Buffer.alloc(200 * 1024, 'B')
    ]))

    const largeScan = await scanWithClamAvStream(largeFile, TEST_HOST, TEST_PORT, 10000)
    assert(
      !largeScan.isSafe && largeScan.threatName?.includes('Trojan'),
      'Test 4: Multi-chunk streamed disk file (400KB+) scanned via INSTREAM and threat detected',
      `isSafe=${largeScan.isSafe}, threat=${largeScan.threatName}`
    )

    // Close daemon to test fallback behavior
    await new Promise((r) => daemon.close(r))
    console.log('\n[DAEMON] ClamAV TCP Daemon stopped (simulating service downtime)...')

    // --- TEST 5: Fallback Mode "fail_closed" (Unreachable Daemon -> Reject Upload) ---
    process.env.CLAMAV_HOST = TEST_HOST
    process.env.CLAMAV_PORT = String(TEST_PORT)
    process.env.CLAMAV_FALLBACK_MODE = 'fail_closed'

    const failClosedScan = await scanFileContent(cleanBuffer, 'document.pdf')
    assert(
      !failClosedScan.isSafe && failClosedScan.threatName === 'ClamAV-Unavailable-ScanFailed',
      'Test 5: Fail-Closed Policy: Unreachable ClamAV rejects upload with ClamAV-Unavailable-ScanFailed',
      `isSafe=${failClosedScan.isSafe}, threat=${failClosedScan.threatName}`
    )

    // --- TEST 6: Fallback Mode "fail_open" (Unreachable Daemon -> Allow with Warning Log) ---
    process.env.CLAMAV_FALLBACK_MODE = 'fail_open'
    const failOpenScan = await scanFileContent(cleanBuffer, 'document.pdf')
    assert(
      failOpenScan.isSafe && failOpenScan.fallbackBypass === true,
      'Test 6: Fail-Open Policy: Unreachable ClamAV logs audit bypass and permits clean file',
      `isSafe=${failOpenScan.isSafe}, bypass=${failOpenScan.fallbackBypass}`
    )

  } finally {
    // Clean up temporary test file
    const largeFile = path.resolve('storage/uploads/clamav_test_file.bin')
    if (fs.existsSync(largeFile)) fs.unlinkSync(largeFile)
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`CLAMAV PIPELINE RESULTS: ${passed}/${total} TESTS PASSED`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  if (passed === total) process.exit(0)
  else process.exit(1)
}

runClamAvTests().catch((err) => {
  console.error('ClamAV test suite error:', err)
  process.exit(1)
})
