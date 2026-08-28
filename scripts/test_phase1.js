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
  console.log('🔒 PHASE 1 SECURITY AUDIT EXTENDED VERIFICATION')
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

  // TEST 1: Direct public storage access must be 404
  const res1 = await request('/uploads/test.txt')
  assert(res1.status === 404, 'Test 1: Static /uploads route returns 404 (no direct file exposure)', `Got status ${res1.status}`)

  // TEST 2: Admin Page Protection without auth
  const res2 = await request('/admin')
  assert(res2.status === 307 || res2.status === 302 || res2.status === 401 || res2.status === 403,
    'Test 2: /admin redirects or denies unauthenticated user', `Got status ${res2.status}`)

  // TEST 3: Admin API Route Protection without auth
  const res3a = await request('/api/admin/transfers/invalid-id', { method: 'DELETE' })
  const res3b = await request('/api/admin/users/invalid-id', { method: 'DELETE' })
  assert((res3a.status === 401 || res3a.status === 403) && (res3b.status === 401 || res3b.status === 403),
    'Test 3: /api/admin/transfers/[id] and /api/admin/users/[id] reject unauthenticated requests with 403',
    `transfers=${res3a.status}, users=${res3b.status}`)

  // TEST 4: Cron endpoint fails closed without x-cron-secret
  const res4 = await request('/api/cron', { method: 'POST' })
  assert(res4.status === 401, 'Test 4: /api/cron rejects request without x-cron-secret (401)', `Got status ${res4.status}`)

  // TEST 5: Cron endpoint succeeds with valid x-cron-secret from .env
  const envContent = fs.readFileSync(path.resolve('.env'), 'utf8')
  const cronMatch = envContent.match(/CRON_SECRET=["']?([^"'\r\n]+)["']?/)
  const cronSecret = cronMatch ? cronMatch[1] : null

  if (cronSecret) {
    const res5 = await request('/api/cron', {
      method: 'POST',
      headers: { 'x-cron-secret': cronSecret }
    })
    assert(res5.status === 200 && (res5.json?.cleaned !== undefined || res5.json?.success),
      'Test 5: /api/cron succeeds with valid x-cron-secret (200)', `Got status ${res5.status}`)
  }

  // TEST 6: Independent x-transfer-token tests across ALL 4 upload endpoints (Missing & Mismatched)
  const transferSetup = await request('/api/transfers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { name: 'Token Validation Test Transfer', expiryDays: 1 }
  })
  const testTransfer = transferSetup.json?.data || transferSetup.json
  const validUploadToken = testTransfer.uploadToken
  const invalidToken = '0000000000000000000000000000000000000000000000000000000000000000'

  // Endpoint 1: /api/uploads/initiate (missing + mismatched)
  const initMissing = await request('/api/uploads/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { transferId: testTransfer.transferId, filename: 'f1.txt', mimeType: 'text/plain', size: 10, totalChunks: 1 }
  })
  const initMismatched = await request('/api/uploads/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-transfer-token': invalidToken },
    body: { transferId: testTransfer.transferId, filename: 'f1.txt', mimeType: 'text/plain', size: 10, totalChunks: 1 }
  })
  assert(initMissing.status === 401 && initMismatched.status === 401,
    'Test 6a: /api/uploads/initiate independently rejects missing (401) and mismatched (401) tokens',
    `missing=${initMissing.status}, mismatched=${initMismatched.status}`)

  // Create valid file session for chunk/complete testing
  const initValid = await request('/api/uploads/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-transfer-token': validUploadToken },
    body: { transferId: testTransfer.transferId, filename: 'f1.txt', mimeType: 'text/plain', size: 10, totalChunks: 1 }
  })
  const testFileId = initValid.json?.fileId || initValid.json?.data?.fileId

  // Endpoint 2: /api/uploads/[fileId]/chunk (missing + mismatched)
  const chunkData = createMultipartBody({ chunkIndex: '0', totalChunks: '1', chunkSize: '10' }, 'chunk', 'blob', Buffer.from('hello-1234'))
  const chunkMissing = await request(`/api/uploads/${testFileId}/chunk`, {
    method: 'POST',
    headers: { ...chunkData.headers },
    body: chunkData.body
  })
  const chunkMismatched = await request(`/api/uploads/${testFileId}/chunk`, {
    method: 'POST',
    headers: { ...chunkData.headers, 'x-transfer-token': invalidToken },
    body: chunkData.body
  })
  assert(chunkMissing.status === 401 && chunkMismatched.status === 401,
    'Test 6b: /api/uploads/[fileId]/chunk independently rejects missing (401) and mismatched (401) tokens',
    `missing=${chunkMissing.status}, mismatched=${chunkMismatched.status}`)

  // Endpoint 3: /api/uploads/[fileId]/complete (missing + mismatched)
  const compMissing = await request(`/api/uploads/${testFileId}/complete`, { method: 'POST' })
  const compMismatched = await request(`/api/uploads/${testFileId}/complete`, {
    method: 'POST',
    headers: { 'x-transfer-token': invalidToken }
  })
  assert(compMissing.status === 401 && compMismatched.status === 401,
    'Test 6c: /api/uploads/[fileId]/complete independently rejects missing (401) and mismatched (401) tokens',
    `missing=${compMissing.status}, mismatched=${compMismatched.status}`)

  // Endpoint 4: /api/transfers/[id]/finalize (missing + mismatched)
  const finMissing = await request(`/api/transfers/${testTransfer.transferId}/finalize`, { method: 'POST' })
  const finMismatched = await request(`/api/transfers/${testTransfer.transferId}/finalize`, {
    method: 'POST',
    headers: { 'x-transfer-token': invalidToken }
  })
  assert(finMissing.status === 401 && finMismatched.status === 401,
    'Test 6d: /api/transfers/[id]/finalize independently rejects missing (401) and mismatched (401) tokens',
    `missing=${finMissing.status}, mismatched=${finMismatched.status}`)

  // TEST 7: OTP send rate limiting
  let otpRateLimitTriggered = false
  const floodIp = `10.${Math.floor(Math.random() * 200 + 10)}.99.1`
  const floodEmail = `flood_otp_test_${Date.now()}@example.com`
  for (let i = 0; i < 6; i++) {
    const resOtp = await request('/api/auth/otp/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': floodIp
      },
      body: { email: floodEmail, type: 'auth' }
    })
    if (resOtp.status === 429) {
      otpRateLimitTriggered = true
      break
    }
  }
  assert(otpRateLimitTriggered, 'Test 7: OTP send enforces rate limiting and returns 429 on rapid requests', `Triggered=${otpRateLimitTriggered}`)


  // TEST 8: Full Anonymous End-to-End Upload Happy Path (No session/auth)
  console.log('\n--- Running Anonymous Upload End-to-End Test ---')
  const testPayload = Buffer.from('DropLync Anonymous Upload Verification Content - ' + Date.now())
  const anonIp = '10.88.88.' + Math.floor(Math.random() * 200 + 1)

  // Step 1: Anonymous transfer creation
  const anonTransferRes = await request('/api/transfers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-forwarded-for': anonIp
    },
    body: { name: 'Anonymous Verification Transfer', expiryDays: 2 }
  })
  const anonTransfer = anonTransferRes.json?.data || anonTransferRes.json
  const step1Ok = anonTransferRes.status === 201 && anonTransfer?.transferId && anonTransfer?.uploadToken


  // Step 2: Anonymous upload initiate with x-transfer-token
  const anonInitRes = await request('/api/uploads/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-transfer-token': anonTransfer.uploadToken
    },
    body: {
      transferId: anonTransfer.transferId,
      filename: 'anonymous_doc.txt',
      mimeType: 'text/plain',
      size: testPayload.length,
      totalChunks: 1
    }
  })
  const anonFileId = anonInitRes.json?.fileId || anonInitRes.json?.data?.fileId
  const step2Ok = (anonInitRes.status === 200 || anonInitRes.status === 201) && Boolean(anonFileId)

  // Step 3: Anonymous chunk upload with x-transfer-token
  const anonChunkData = createMultipartBody(
    { chunkIndex: '0', totalChunks: '1', chunkSize: String(testPayload.length) },
    'chunk',
    'anonymous_doc.txt',
    testPayload
  )
  const anonChunkRes = await request(`/api/uploads/${anonFileId}/chunk`, {
    method: 'POST',
    headers: {
      ...anonChunkData.headers,
      'x-transfer-token': anonTransfer.uploadToken
    },
    body: anonChunkData.body
  })
  const step3Ok = anonChunkRes.status === 200

  // Step 4: Anonymous file complete with x-transfer-token
  const anonCompRes = await request(`/api/uploads/${anonFileId}/complete`, {
    method: 'POST',
    headers: { 'x-transfer-token': anonTransfer.uploadToken }
  })
  const step4Ok = anonCompRes.status === 200

  // Step 5: Anonymous transfer finalize with x-transfer-token
  const anonFinRes = await request(`/api/transfers/${anonTransfer.transferId}/finalize`, {
    method: 'POST',
    headers: { 'x-transfer-token': anonTransfer.uploadToken }
  })
  const step5Ok = anonFinRes.status === 200

  // Step 6: Download the newly uploaded anonymous file via public share link
  const anonDownloadRes = await request(`/api/share/${anonTransfer.token}/files/${anonFileId}`)
  const step6Ok = anonDownloadRes.status === 200 && anonDownloadRes.body === testPayload.toString('utf8')

  assert(
    step1Ok && step2Ok && step3Ok && step4Ok && step5Ok && step6Ok,
    'Test 8: Anonymous user end-to-end upload and download succeeds 100% without login',
    `step1=${anonTransferRes.status}, step2=${anonInitRes.status}, step3=${anonChunkRes.status}, step4=${anonCompRes.status}, step5=${anonFinRes.status}, step6=${anonDownloadRes.status}`
  )

  // TEST 9: Pre-Migration Share Link & File Download Verification
  console.log('\n--- Running Pre-Migration Share Link Verification ---')
  const preMigrationTransfer = await prisma.transfer.findFirst({
    where: { isActive: true },
    include: { files: true }
  })

  if (preMigrationTransfer && preMigrationTransfer.files.length > 0) {
    const preMigFile = preMigrationTransfer.files[0]
    const preMigDownloadRes = await request(`/api/share/${preMigrationTransfer.token}/files/${preMigFile.id}`)

    const fileExistsInStorage = preMigFile.storagePath && fs.existsSync(path.resolve(preMigFile.storagePath))
    const pointsToStorage = preMigFile.storagePath.includes('storage')

    assert(
      pointsToStorage && fileExistsInStorage && preMigDownloadRes.status === 200,
      `Test 9: Pre-migration share link (${preMigFile.originalName}) resolves from ./storage/uploads and downloads successfully (200)`,
      `pointsToStorage=${pointsToStorage}, fileExists=${fileExistsInStorage}, status=${preMigDownloadRes.status}`
    )
  } else {
    // If no existing transfer, create a fixture with old-style path and test resilient resolution
    const fixtureToken = 'pre-migration-test-token-' + Date.now()
    const fixtureTransfer = await prisma.transfer.create({
      data: {
        token: fixtureToken,
        name: 'Pre-Migration Test Transfer',
        expiresAt: new Date(Date.now() + 86400000),
        isActive: true,
        files: {
          create: {
            originalName: 'pre_migration_sample.txt',
            size: BigInt(25),
            mimeType: 'text/plain',
            storagePath: 'storage/uploads/files/pre_mig_test/sample.txt'
          }
        }
      },
      include: { files: true }
    })
    fs.mkdirSync(path.resolve('storage/uploads/files/pre_mig_test'), { recursive: true })
    fs.writeFileSync(path.resolve('storage/uploads/files/pre_mig_test/sample.txt'), 'Pre-migration content test')

    const fixtureDownload = await request(`/api/share/${fixtureTransfer.token}/files/${fixtureTransfer.files[0].id}`)
    assert(
      fixtureDownload.status === 200 && fixtureDownload.body === 'Pre-migration content test',
      'Test 9: Pre-migration share link fixture resolves from ./storage/uploads and downloads successfully (200)',
      `status=${fixtureDownload.status}`
    )
  }

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`AUDIT RESULTS: ${passed}/${total} EXTENDED TESTS PASSED`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  await prisma.$disconnect()

  if (passed === total) {
    process.exit(0)
  } else {
    process.exit(1)
  }
}

runTests().catch(async (err) => {
  console.error('Test execution error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
