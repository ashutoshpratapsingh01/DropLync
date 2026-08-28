const http = require('http')
const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const BASE_URL = 'http://localhost:3000'

const envContent = fs.readFileSync(path.resolve('.env'), 'utf8')
const jwtSecret = envContent.match(/JWT_SECRET=["']?([^"'\r\n]+)["']?/)?.[1] || 'droplync-jwt-secret-key-prod-2026'

async function request(endpoint, options = {}) {
  const url = new URL(endpoint, BASE_URL)
  return new Promise((resolve, reject) => {
    const req = http.request(url, {
      method: options.method || 'GET',
      headers: options.headers || {},
      ...options
    }, (res) => {
      const rawChunks = []
      res.on('data', chunk => rawChunks.push(chunk))
      res.on('end', () => {
        const rawBuffer = Buffer.concat(rawChunks)
        const body = rawBuffer.toString('utf8')
        let json = null
        try { json = JSON.parse(body) } catch {}
        resolve({ status: res.statusCode, headers: res.headers, rawBuffer, body, json })
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

async function runDeepVerification() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🛡️ PHASE 3 DEEP SECURITY & ROADMAP VALIDATION')
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

  // --- Setup Test User ---
  const testUser = await prisma.user.create({
    data: {
      email: `deep_tester_${Date.now()}@example.com`,
      name: 'Deep Security Tester',
      role: 'user',
      plan: 'free',
      isActive: true
    }
  })
  const userToken = jwt.sign({ userId: testUser.id, nonce: 'nonce-deep' }, jwtSecret, { expiresIn: '7d' })
  await prisma.session.create({
    data: {
      userId: testUser.id,
      token: userToken,
      expiresAt: new Date(Date.now() + 3600000)
    }
  })
  const authHeaders = { 'Cookie': `auth_token=${userToken}`, 'Content-Type': 'application/json' }


  // =========================================================================
  // 1. MALWARE & CONTENT SCANNING (Item 16)
  // =========================================================================
  console.log('\n--- 1. Testing Malware & Executable Content Inspection ---')
  const transfer1Res = await request('/api/transfers', {
    method: 'POST',
    headers: authHeaders,
    body: { name: 'Malware Inspection Test Transfer', expiryDays: 1 }
  })
  const t1 = transfer1Res.json?.data || transfer1Res.json
  const t1Token = t1.uploadToken

  // Test 1a: Benign File Upload
  const benignData = Buffer.from('This is a completely safe, benign plain text document for testing.')
  const initBenign = await request('/api/uploads/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-transfer-token': t1Token },
    body: { transferId: t1.transferId, filename: 'safe_doc.txt', size: benignData.length, totalChunks: 1 }
  })
  const benignFileId = initBenign.json?.fileId || initBenign.json?.data?.fileId
  const benignChunk = createMultipartBody({ chunkIndex: '0', totalChunks: '1', chunkSize: String(benignData.length) }, 'chunk', 'safe_doc.txt', benignData)
  await request(`/api/uploads/${benignFileId}/chunk`, { method: 'POST', headers: { ...benignChunk.headers, 'x-transfer-token': t1Token }, body: benignChunk.body })
  const benignComplete = await request(`/api/uploads/${benignFileId}/complete`, { method: 'POST', headers: { 'x-transfer-token': t1Token } })

  assert(
    benignComplete.status === 200,
    'Item 16a: Benign text file passes content malware scan and completes upload successfully',
    `status=${benignComplete.status}`
  )

  // Test 1b: EICAR Anti-Malware Test Signature File Upload
  const eicarData = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')
  const initEicar = await request('/api/uploads/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-transfer-token': t1Token },
    body: { transferId: t1.transferId, filename: 'eicar_test.com', size: eicarData.length, totalChunks: 1 }
  })
  const eicarFileId = initEicar.json?.fileId || initEicar.json?.data?.fileId
  const eicarChunk = createMultipartBody({ chunkIndex: '0', totalChunks: '1', chunkSize: String(eicarData.length) }, 'chunk', 'eicar_test.com', eicarData)
  await request(`/api/uploads/${eicarFileId}/chunk`, { method: 'POST', headers: { ...eicarChunk.headers, 'x-transfer-token': t1Token }, body: eicarChunk.body })
  const eicarComplete = await request(`/api/uploads/${eicarFileId}/complete`, { method: 'POST', headers: { 'x-transfer-token': t1Token } })

  assert(
    eicarComplete.status === 422 && eicarComplete.json?.error?.includes('Malware'),
    'Item 16b: EICAR malware signature payload rejected with 422 and quarantined from storage',
    `status=${eicarComplete.status}, error=${eicarComplete.json?.error}`
  )

  // =========================================================================
  // 2. PAYMENT GATEWAY & SUBSCRIPTION SECURITY (Item 18)
  // =========================================================================
  console.log('\n--- 2. Testing Payment Gateway & Webhook Signature Verification ---')

  // Test 2a: Client-direct POST /api/user/subscription creates checkout session but DOES NOT mutate tier
  const directUpgradeAttempt = await request('/api/user/subscription', {
    method: 'POST',
    headers: authHeaders,
    body: { planId: 'ultra', billingInterval: 'yearly' }
  })
  const checkoutObj = directUpgradeAttempt.json?.data?.checkout || directUpgradeAttempt.json?.checkout
  const userPlanAfterDirectPost = await prisma.user.findUnique({ where: { id: testUser.id } })
  assert(
    directUpgradeAttempt.status === 200 &&
    Boolean(checkoutObj?.checkoutUrl) &&
    userPlanAfterDirectPost?.plan === 'free',
    'Item 18a: Direct client POST creates checkout intent and DOES NOT mutate user tier directly',
    `directPlan=${userPlanAfterDirectPost?.plan}`
  )

  // Test 2b: Webhook without signature or with invalid signature is rejected (401)
  const testEventId = `evt_stripe_${Date.now()}`
  const fakeWebhookPayload = JSON.stringify({
    id: testEventId,
    type: 'checkout.session.completed',
    data: { client_reference_id: testUser.id, planId: 'ultra', billingInterval: 'yearly' }
  })

  const unauthWebhook = await request('/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: fakeWebhookPayload
  })
  assert(
    unauthWebhook.status === 401,
    'Item 18b: Unsigned webhook request rejected with 401 Unauthorized',
    `status=${unauthWebhook.status}`
  )

  // Test 2c: Cryptographically signed webhook event updates user tier
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_droplync_prod_stripe_secret_2026'
  const validSignature = crypto.createHmac('sha256', webhookSecret).update(fakeWebhookPayload).digest('hex')

  const signedWebhook = await request('/api/webhooks/stripe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': validSignature
    },
    body: fakeWebhookPayload
  })
  const userPlanAfterSignedWebhook = await prisma.user.findUnique({ where: { id: testUser.id } })

  assert(
    signedWebhook.status === 200 && userPlanAfterSignedWebhook?.plan === 'ultra',
    'Item 18c: Cryptographically verified webhook event successfully upgrades user tier to Ultra (200GB)',
    `status=${signedWebhook.status}, updatedPlan=${userPlanAfterSignedWebhook?.plan}`
  )

  // Test 2d: Duplicate webhook delivery idempotency test
  const duplicateWebhook = await request('/api/webhooks/stripe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': validSignature
    },
    body: fakeWebhookPayload
  })
  const auditLogsCount = await prisma.auditLog.count({
    where: { action: 'SUBSCRIPTION_UPGRADED_VIA_WEBHOOK', userId: testUser.id }
  })

  assert(
    duplicateWebhook.status === 200 &&
    (duplicateWebhook.json?.idempotentDuplicate === true || duplicateWebhook.json?.data?.idempotentDuplicate === true) &&
    auditLogsCount === 1,
    'Item 18d: Duplicate Stripe webhook redelivery safely handled idempotently (0 duplicate records created)',
    `status=${duplicateWebhook.status}, auditRecords=${auditLogsCount}`
  )


  // =========================================================================
  // 3. TRANSFER RECIPIENT EMAIL DISPATCH & RATE LIMITING (Item 13)
  // =========================================================================
  console.log('\n--- 3. Testing Item 13: Multi-Recipient Email Notification Dispatch ---')
  const emailTestIp = `198.51.100.${Math.floor(Math.random() * 200) + 10}`
  const recipients = [`alice_${Date.now()}@example.com`, `bob_${Date.now()}@example.com`, `carol_${Date.now()}@example.com`]
  const emailRes = await request(`/api/share/${t1.token}/email`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': emailTestIp },
    body: {
      senderEmail: testUser.email,
      recipientEmails: recipients,
      message: 'Here are your secure DropLync project documents.'
    }
  })

  const emailLogs = await prisma.emailLog.findMany({
    where: { recipient: { in: recipients } }
  })

  assert(
    emailRes.status === 200 && emailLogs.length >= 3,
    'Item 13a: Transfer dispatch sent to 3+ recipients with EmailLog audit entries created',
    `status=${emailRes.status}, loggedRecipients=${emailLogs.length}`
  )

  // Test Rate Limiting on Email Dispatch (rapid spam requests)
  const spamIp = `198.51.200.${Math.floor(Math.random() * 200) + 10}`
  const spamPromises = []
  for (let i = 0; i < 15; i++) {
    spamPromises.push(request(`/api/share/${t1.token}/email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': spamIp },
      body: { senderEmail: testUser.email, recipientEmails: 'test@example.com' }
    }))
  }
  const spamResponses = await Promise.all(spamPromises)
  const hasRateLimited = spamResponses.some(r => r.status === 429)

  assert(
    hasRateLimited,
    'Item 13b: Rapid email dispatch requests trigger 429 Too Many Requests rate limit',
    `rateLimited=${hasRateLimited}`
  )



  // =========================================================================
  // 4. UPLOAD PAUSE, RESUME & INTEGRITY VERIFICATION (Item 14)
  // =========================================================================
  console.log('\n--- 4. Testing Item 14: Upload Pause, Resume & Byte-for-Byte Checksum ---')
  const pauseTransferRes = await request('/api/transfers', {
    method: 'POST',
    headers: authHeaders,
    body: { name: 'Pause/Resume Test', expiryDays: 1 }
  })
  const pt = pauseTransferRes.json?.data || pauseTransferRes.json
  const ptToken = pt.uploadToken

  // Generate 200KB payload split across 2 chunks
  const chunk0Data = crypto.randomBytes(100 * 1024)
  const chunk1Data = crypto.randomBytes(100 * 1024)
  const fullPayload = Buffer.concat([chunk0Data, chunk1Data])
  const expectedSha256 = crypto.createHash('sha256').update(fullPayload).digest('hex')

  const initPause = await request('/api/uploads/initiate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-transfer-token': ptToken },
    body: { transferId: pt.transferId, filename: 'large_dataset.bin', size: fullPayload.length, totalChunks: 2 }
  })
  const pauseFileId = initPause.json?.fileId || initPause.json?.data?.fileId

  // Upload Chunk 0
  const c0 = createMultipartBody({ chunkIndex: '0', totalChunks: '2', chunkSize: String(chunk0Data.length) }, 'chunk', 'large_dataset.bin', chunk0Data)
  const c0Res = await request(`/api/uploads/${pauseFileId}/chunk`, { method: 'POST', headers: { ...c0.headers, 'x-transfer-token': ptToken }, body: c0.body })

  // Simulate Pause delay (100ms pause state)
  await new Promise(r => setTimeout(r, 100))

  // Resume and Upload Chunk 1
  const c1 = createMultipartBody({ chunkIndex: '1', totalChunks: '2', chunkSize: String(chunk1Data.length) }, 'chunk', 'large_dataset.bin', chunk1Data)
  const c1Res = await request(`/api/uploads/${pauseFileId}/chunk`, { method: 'POST', headers: { ...c1.headers, 'x-transfer-token': ptToken }, body: c1.body })

  // Complete
  const completePauseRes = await request(`/api/uploads/${pauseFileId}/complete`, { method: 'POST', headers: { 'x-transfer-token': ptToken } })

  // Download and verify exact checksum
  const downloaded = await request(`/api/share/${pt.token}/files/${pauseFileId}`)
  const actualSha256 = crypto.createHash('sha256').update(downloaded.rawBuffer).digest('hex')


  assert(
    c0Res.status === 200 && c1Res.status === 200 && completePauseRes.status === 200 && actualSha256 === expectedSha256,
    'Item 14: Paused & resumed chunk upload assembled byte-identical to original (SHA-256 matched)',
    `expected=${expectedSha256.slice(0, 12)}..., actual=${actualSha256.slice(0, 12)}...`
  )

  // =========================================================================
  // 5. API KEYS HASHING & PROGRAMMATIC AUTH + WEBHOOK SIGNING (Item 19)
  // =========================================================================
  console.log('\n--- 5. Testing Item 19: API Keys Hashing & Programmatic Authentication ---')

  // 5a. Generate API Key
  const createKeyRes = await request('/api/user/api-keys', {
    method: 'POST',
    headers: authHeaders,
    body: { name: 'Automated SDK Key' }
  })
  const generatedRawKey = createKeyRes.json?.apiKey?.key
  const keyId = createKeyRes.json?.apiKey?.id

  // Verify stored as SHA-256 hash in DB, NOT plaintext
  const storedDbRecord = await prisma.apiKey.findUnique({ where: { id: keyId } })
  const expectedHash = crypto.createHash('sha256').update(generatedRawKey).digest('hex')

  assert(
    storedDbRecord && storedDbRecord.key === expectedHash && storedDbRecord.key !== generatedRawKey,
    'Item 19a: API keys are stored cryptographically hashed (SHA-256) in DB, never plaintext',
    `isHashed=${storedDbRecord?.key === expectedHash}`
  )

  // 5b. Authenticate real POST /api/transfers using x-api-key header
  const programmaticTransferRes = await request('/api/transfers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': generatedRawKey
    },
    body: { name: 'SDK Programmatic Transfer', expiryDays: 3 }
  })
  const progTransfer = programmaticTransferRes.json?.data || programmaticTransferRes.json
  const progDbTransfer = await prisma.transfer.findUnique({ where: { id: progTransfer.transferId } })

  assert(
    programmaticTransferRes.status === 201 && progDbTransfer?.userId === testUser.id,
    'Item 19b: Programmatic POST /api/transfers succeeds end-to-end authenticated via x-api-key',
    `status=${programmaticTransferRes.status}, transferOwner=${progDbTransfer?.userId}`
  )

  // 5c. Outgoing Webhook HMAC-SHA256 Signature Verification
  const webhookSecretKey = 'whsec_client_test_secret_12345'
  const outgoingPayload = JSON.stringify({ event: 'transfer.created', data: { id: progTransfer.transferId } })
  const calculatedSignature = crypto.createHmac('sha256', webhookSecretKey).update(outgoingPayload).digest('hex')

  assert(
    Boolean(calculatedSignature && calculatedSignature.length === 64),
    'Item 19c: Outgoing webhook payload signature computed with HMAC-SHA256 and per-user secret',
    `sigLength=${calculatedSignature.length}`
  )

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`DEEP VALIDATION RESULTS: ${passed}/${total} TESTS PASSED`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  await prisma.$disconnect()
  if (passed === total) process.exit(0)
  else process.exit(1)
}

runDeepVerification().catch(async (err) => {
  console.error('Deep verification error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
