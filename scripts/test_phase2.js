const http = require('http')
const fs = require('fs')
const path = require('path')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const BASE_URL = 'http://localhost:3000'

async function request(endpoint, options = {}) {
  const url = new URL(endpoint, BASE_URL)
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    }, (res) => {
      let body = ''
      res.on('data', chunk => body += chunk)
      res.on('end', () => {
        let json = null
        try { json = JSON.parse(body) } catch {}
        resolve({ status: res.statusCode, headers: res.headers, body, json })
      })
    })
    req.on('error', reject)
    if (options.body) {
      if (typeof options.body === 'string' || Buffer.isBuffer(options.body)) {
        req.write(options.body)
      } else {
        req.write(JSON.stringify(options.body))
      }
    }
    req.end()
  })
}

function createMultipartBody(fields, fileField, fileName, fileBuffer) {
  const boundary = '----WebKitFormBoundary' + Math.random().toString(36).slice(2)
  const chunks = []

  for (const [k, v] of Object.entries(fields)) {
    chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`))
  }

  chunks.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${fileField}"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`))
  chunks.push(fileBuffer)
  chunks.push(Buffer.from(`\r\n--${boundary}--\r\n`))

  return {
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`
    },
    body: Buffer.concat(chunks)
  }
}

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🧪 PHASE 2 DATA INTEGRITY & BUG FIXES VERIFICATION')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')

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

  // --- ITEM 7: Single-File Download Audit Logging ---
  console.log('\n--- Testing Item 7: Single-File Download Logging & IP Anonymization ---')
  const testTransfer1 = await prisma.transfer.create({
    data: {
      token: 'item7-test-token-' + Date.now(),
      name: 'Item 7 Single Download Test',
      expiresAt: new Date(Date.now() + 86400000),
      isActive: true,
      files: {
        create: {
          originalName: 'single_test_doc.txt',
          size: BigInt(20),
          mimeType: 'text/plain',
          storagePath: 'storage/uploads/files/item7_test/doc.txt'
        }
      }
    },
    include: { files: true }
  })
  fs.mkdirSync(path.resolve('storage/uploads/files/item7_test'), { recursive: true })
  fs.writeFileSync(path.resolve('storage/uploads/files/item7_test/doc.txt'), 'Single download test!')

  const clientTestIp = '203.0.113.195'
  const expectedAnonymizedIp = '203.0.113.0'

  const downloadRes = await request(`/api/share/${testTransfer1.token}/files/${testTransfer1.files[0].id}`, {
    headers: { 'x-forwarded-for': clientTestIp }
  })

  // Wait 100ms for non-blocking DB insert
  await new Promise(r => setTimeout(r, 150))

  const downloadLog = await prisma.downloadLog.findFirst({
    where: { transferId: testTransfer1.id, fileId: testTransfer1.files[0].id }
  })

  assert(
    downloadRes.status === 200 && downloadLog && downloadLog.ipAddress === expectedAnonymizedIp,
    'Item 7: Single-file download generates DownloadLog entry with GDPR-anonymized IP',
    `status=${downloadRes.status}, logExists=${Boolean(downloadLog)}, loggedIp=${downloadLog?.ipAddress}`
  )

  // --- ITEM 8: Transfer.totalSize Aggregate Recalculation ---
  console.log('\n--- Testing Item 8: Transfer.totalSize Aggregate Recalculation ---')
  const anonTransferRes = await request('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { name: 'Item 8 Total Size Aggregate Test', expiryDays: 1 }
  })
  const anonTransfer = anonTransferRes.json?.data || anonTransferRes.json
  const token = anonTransfer.uploadToken

  const file1Data = Buffer.from('file-one-content-100-bytes-sample-padding-123456789012345678901234567890123456789012345678901234567890')
  const file2Data = Buffer.from('file-two-content-50-bytes-sample-padding-1234567890')
  const expectedTotalBytes = BigInt(file1Data.length + file2Data.length)

  // Upload File 1
  const init1 = await request('/api/uploads/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-transfer-token': token },
    body: { transferId: anonTransfer.transferId, filename: 'f1.txt', size: file1Data.length, totalChunks: 1 }
  })
  const f1Id = init1.json?.fileId || init1.json?.data?.fileId
  const chunk1 = createMultipartBody({ chunkIndex: '0', totalChunks: '1', chunkSize: String(file1Data.length) }, 'chunk', 'f1.txt', file1Data)
  await request(`/api/uploads/${f1Id}/chunk`, { method: 'POST', headers: { ...chunk1.headers, 'x-transfer-token': token }, body: chunk1.body })
  await request(`/api/uploads/${f1Id}/complete`, { method: 'POST', headers: { 'x-transfer-token': token } })

  // Upload File 2
  const init2 = await request('/api/uploads/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-transfer-token': token },
    body: { transferId: anonTransfer.transferId, filename: 'f2.txt', size: file2Data.length, totalChunks: 1 }
  })
  const f2Id = init2.json?.fileId || init2.json?.data?.fileId
  const chunk2 = createMultipartBody({ chunkIndex: '0', totalChunks: '1', chunkSize: String(file2Data.length) }, 'chunk', 'f2.txt', file2Data)
  await request(`/api/uploads/${f2Id}/chunk`, { method: 'POST', headers: { ...chunk2.headers, 'x-transfer-token': token }, body: chunk2.body })
  await request(`/api/uploads/${f2Id}/complete`, { method: 'POST', headers: { 'x-transfer-token': token } })

  // Check DB Transfer.totalSize
  const updatedTransfer = await prisma.transfer.findUnique({ where: { id: anonTransfer.transferId } })
  assert(
    updatedTransfer && updatedTransfer.totalSize === expectedTotalBytes,
    `Item 8: Transfer.totalSize automatically recalculated to exact sum (${expectedTotalBytes.toString()} bytes)`,
    `actual=${updatedTransfer?.totalSize?.toString()}, expected=${expectedTotalBytes.toString()}`
  )

  // --- ITEM 9: Admin API Routes (Stats & Paginated Transfers) ---
  console.log('\n--- Testing Item 9: Admin API Routes (/api/admin/stats & /api/admin/transfers) ---')
  const unauthStats = await request('/api/admin/stats')
  const unauthTransfers = await request('/api/admin/transfers')
  assert(
    unauthStats.status === 403 && unauthTransfers.status === 403,
    'Item 9a: Unauthenticated requests to /api/admin/stats and /api/admin/transfers return 403 Forbidden',
    `statsStatus=${unauthStats.status}, transfersStatus=${unauthTransfers.status}`
  )

  // Setup admin user & session for authenticated test
  const jwt = require('jsonwebtoken')
  const envContent = fs.readFileSync(path.resolve('.env'), 'utf8')
  const jwtSecret = envContent.match(/JWT_SECRET=["']?([^"'\r\n]+)["']?/)?.[1] || 'droplync-jwt-secret-key-prod-2026'

  const adminEmail = 'test_admin_phase2_' + Date.now() + '@example.com'
  const adminUser = await prisma.user.create({
    data: {
      email: adminEmail,
      name: 'Phase 2 Admin',
      role: 'admin',
      isActive: true
    }
  })
  const sessionToken = jwt.sign({ userId: adminUser.id, nonce: 'nonce-' + Date.now() }, jwtSecret, { expiresIn: '7d' })
  await prisma.session.create({
    data: {
      userId: adminUser.id,
      token: sessionToken,
      expiresAt: new Date(Date.now() + 3600000)
    }
  })

  // Authenticated admin test
  const authStats = await request('/api/admin/stats', {
    headers: { 'Cookie': `auth_token=${sessionToken}` }
  })
  const authTransfers = await request('/api/admin/transfers?page=1&limit=10', {
    headers: { 'Cookie': `auth_token=${sessionToken}` }
  })


  assert(
    authStats.status === 200 && authStats.json?.stats?.users !== undefined &&
    authTransfers.status === 200 && Array.isArray(authTransfers.json?.transfers) && authTransfers.json?.pagination,
    'Item 9b: Authenticated admin successfully fetches stats & paginated transfers list',
    `statsOk=${Boolean(authStats.json?.stats)}, transfersCount=${authTransfers.json?.transfers?.length}`
  )

  // --- ITEM 10 & 11: Cron Orphaned Chunks and Expired Tokens Cleanup ---
  console.log('\n--- Testing Items 10 & 11: Cron Maintenance Routine ---')
  const cronMatch = envContent.match(/CRON_SECRET=["']?([^"'\r\n]+)["']?/)
  const cronSecret = cronMatch ? cronMatch[1] : null


  // Create expired verification token
  await prisma.verificationToken.create({
    data: {
      email: 'expired_otp_' + Date.now() + '@example.com',
      code: '999999',
      type: 'auth',
      expiresAt: new Date(Date.now() - 3600000) // 1h in the past
    }
  })

  // Create simulated orphaned chunk folder with old timestamp (>25h ago)
  const orphanChunkDir = path.resolve('storage/uploads/chunks/orphan_test_transfer/orphan_test_file')
  fs.mkdirSync(orphanChunkDir, { recursive: true })
  fs.writeFileSync(path.join(orphanChunkDir, 'chunk_0'), 'abandoned chunk data')
  const pastTime = new Date(Date.now() - 25 * 60 * 60 * 1000)
  fs.utimesSync(orphanChunkDir, pastTime, pastTime)

  const cronRes = await request('/api/cron', {
    method: 'POST',
    headers: { 'x-cron-secret': cronSecret }
  })

  const orphanStillExists = fs.existsSync(orphanChunkDir)
  const expiredTokensLeft = await prisma.verificationToken.count({
    where: { expiresAt: { lt: new Date() } }
  })

  assert(
    cronRes.status === 200 && !orphanStillExists && expiredTokensLeft === 0,
    'Items 10 & 11: Cron purges expired verification tokens and orphaned chunk directories (>24h)',
    `status=${cronRes.status}, orphanPurged=${!orphanStillExists}, expiredTokensRemaining=${expiredTokensLeft}`
  )

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`PHASE 2 RESULTS: ${passed}/${total} TESTS PASSED`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  await prisma.$disconnect()
  if (passed === total) process.exit(0)
  else process.exit(1)
}

runTests().catch(async (err) => {
  console.error('Phase 2 test execution error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
