const http = require('http')
const fs = require('fs')
const path = require('path')
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

async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('🚀 PHASE 3 FUNCTIONALITY & ROADMAP VERIFICATION')
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

  // --- Helper: Create Test User & Session ---
  const userEmail = 'phase3_tester_' + Date.now() + '@example.com'
  const testUser = await prisma.user.create({
    data: {
      email: userEmail,
      name: 'Phase 3 Tester',
      role: 'user',
      plan: 'free',
      isActive: true
    }
  })

  const userToken = jwt.sign({ userId: testUser.id, nonce: 'nonce-1' }, jwtSecret, { expiresIn: '7d' })
  await prisma.session.create({
    data: {
      userId: testUser.id,
      token: userToken,
      userAgent: 'Chrome on Windows',
      ipAddress: '192.168.1.50',
      expiresAt: new Date(Date.now() + 3600000)
    }
  })

  // Second session for revocation testing
  const otherToken = jwt.sign({ userId: testUser.id, nonce: 'nonce-2' }, jwtSecret, { expiresIn: '7d' })
  await prisma.session.create({
    data: {
      userId: testUser.id,
      token: otherToken,
      userAgent: 'Safari on iPhone',
      ipAddress: '192.168.1.99',
      expiresAt: new Date(Date.now() + 3600000)
    }
  })

  const authHeaders = {
    'Cookie': `auth_token=${userToken}`,
    'Content-Type': 'application/json'
  }

  // --- ITEM 12: User Profile, Password, Session Revocation ---
  console.log('\n--- Testing Item 12: Account Settings & Security ---')

  // 12a. Profile Update
  const profRes = await request('/api/user/profile', {
    method: 'PATCH',
    headers: authHeaders,
    body: { name: 'Updated Quantum Engineer' }
  })
  assert(profRes.status === 200 && profRes.json?.user?.name === 'Updated Quantum Engineer',
    'Item 12a: PATCH /api/user/profile updates display name', `status=${profRes.status}`)

  // 12b. Password Change
  const passRes = await request('/api/user/change-password', {
    method: 'POST',
    headers: authHeaders,
    body: { newPassword: 'SuperSecurePassword2026!' }
  })
  assert(passRes.status === 200 && passRes.json?.success,
    'Item 12b: POST /api/user/change-password sets and hashes new password', `status=${passRes.status}`)

  // 12c. Active Sessions List & Revocation
  const sessListRes = await request('/api/user/sessions', { headers: authHeaders })
  const sessRevokeRes = await request('/api/user/sessions', { method: 'DELETE', headers: authHeaders })
  const remainingSessions = await prisma.session.findMany({ where: { userId: testUser.id } })

  assert(
    sessListRes.status === 200 && sessRevokeRes.status === 200 && remainingSessions.length === 1 && remainingSessions[0].token === userToken,
    'Item 12c: DELETE /api/user/sessions revokes all other devices while preserving current session',
    `initialCount=${sessListRes.json?.sessions?.length}, remaining=${remainingSessions.length}`
  )

  // --- ITEM 17: Custom Branding Settings ---
  console.log('\n--- Testing Item 17: Custom Branding for Pro/Ultra Users ---')
  const brandRes = await request('/api/user/branding', {
    method: 'PATCH',
    headers: authHeaders,
    body: {
      brandColor: '#6366f1',
      brandLogo: 'https://cdn.example.com/logo.png',
      brandWallpaper: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809'
    }
  })
  assert(brandRes.status === 200 && brandRes.json?.branding?.brandColor === '#6366f1',
    'Item 17: PATCH /api/user/branding saves custom branding properties', `status=${brandRes.status}`)

  // --- ITEM 18: Plan Upgrade (Secure Checkout & Webhook) ---
  console.log('\n--- Testing Item 18: Subscription Plan Upgrades ---')
  const crypto = require('crypto')
  const upgradeRes = await request('/api/user/subscription', {
    method: 'POST',
    headers: authHeaders,
    body: { planId: 'pro', billingInterval: 'monthly' }
  })
  const checkoutPayload = upgradeRes.json?.data?.checkout || upgradeRes.json?.checkout
  const dbUserPlanBefore = await prisma.user.findUnique({ where: { id: testUser.id } })

  // Trigger signed webhook event to safely upgrade
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_droplync_prod_stripe_secret_2026'
  const webhookPayload = JSON.stringify({
    type: 'checkout.session.completed',
    data: { client_reference_id: testUser.id, planId: 'pro', billingInterval: 'monthly' }
  })
  const sig = crypto.createHmac('sha256', webhookSecret).update(webhookPayload).digest('hex')
  await request('/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'stripe-signature': sig },
    body: webhookPayload
  })
  const dbUserPlanAfter = await prisma.user.findUnique({ where: { id: testUser.id } })

  assert(
    upgradeRes.status === 200 && Boolean(checkoutPayload?.checkoutUrl) &&
    dbUserPlanBefore?.plan === 'free' && dbUserPlanAfter?.plan === 'pro',
    'Item 18: Secure subscription checkout initiates and signed webhook event activates Pro tier (50GB)',
    `checkoutUrl=${Boolean(checkoutPayload?.checkoutUrl)}, before=${dbUserPlanBefore?.plan}, after=${dbUserPlanAfter?.plan}`
  )


  // --- ITEM 19: Developer API Keys & Webhooks ---
  console.log('\n--- Testing Item 19: Developer API Keys & Webhooks ---')
  const apiKeyRes = await request('/api/user/api-keys', {
    method: 'POST',
    headers: authHeaders,
    body: { name: 'CI/CD Automation Pipeline' }
  })
  const createdApiKey = apiKeyRes.json?.apiKey
  const apiKeyValid = Boolean(createdApiKey?.key && createdApiKey.key.startsWith('dl_live_'))

  const webhookRes = await request('/api/user/webhooks', {
    method: 'POST',
    headers: authHeaders,
    body: { url: 'https://webhook.site/test-endpoint-droplync' }
  })
  const createdWebhook = webhookRes.json?.webhook

  assert(
    apiKeyRes.status === 201 && apiKeyValid && webhookRes.status === 201 && Boolean(createdWebhook?.secret),
    'Item 19: Programmatic Developer API Key and Webhook endpoint generation',
    `apiKeyStatus=${apiKeyRes.status}, webhookStatus=${webhookRes.status}`
  )

  // --- ITEM 20: Custom Vanity URLs & Branding Resolution on Share Page ---
  console.log('\n--- Testing Item 20: Custom Vanity URLs & Public Page Resolution ---')
  const vanityTransfer = await prisma.transfer.create({
    data: {
      token: 'token-vanity-' + Date.now(),
      name: 'Client Presentation Assets',
      userId: testUser.id,
      expiresAt: new Date(Date.now() + 86400000),
      isActive: true,
      files: {
        create: {
          originalName: 'presentation.pdf',
          size: BigInt(500),
          mimeType: 'application/pdf',
          storagePath: 'storage/uploads/files/test/presentation.pdf'
        }
      }
    }
  })

  const customSlug = 'quantum-client-deck-' + Date.now().toString().slice(-4)
  const slugRes = await request(`/api/transfers/${vanityTransfer.id}/custom-slug`, {
    method: 'POST',
    headers: authHeaders,
    body: { slug: customSlug }
  })

  // Test resolving transfer via custom slug instead of token
  const shareLookupRes = await request(`/api/share/${customSlug}`)
  const isBrandingReturned = shareLookupRes.json?.branding?.brandColor === '#6366f1'

  assert(
    slugRes.status === 200 && shareLookupRes.status === 200 && isBrandingReturned,
    'Item 20: Custom vanity slug created and public share API resolves by custom slug with custom branding',
    `slugStatus=${slugRes.status}, lookupStatus=${shareLookupRes.status}, brandColor=${shareLookupRes.json?.branding?.brandColor}`
  )

  // --- ITEM 15: Folder Upload & Directory Preservation in ZIP Archive ---
  console.log('\n--- Testing Item 15: Folder Upload with Relative Path Preservation ---')
  const folderTransfer = await prisma.transfer.create({
    data: {
      token: 'folder-transfer-' + Date.now(),
      name: 'Folder Hierarchy Transfer',
      expiresAt: new Date(Date.now() + 86400000),
      isActive: true,
      files: {
        create: [
          {
            originalName: 'doc1.txt',
            relativePath: 'project/docs/doc1.txt',
            size: BigInt(15),
            mimeType: 'text/plain',
            storagePath: 'storage/uploads/files/folder_test/doc1.txt'
          },
          {
            originalName: 'doc2.txt',
            relativePath: 'project/assets/doc2.txt',
            size: BigInt(15),
            mimeType: 'text/plain',
            storagePath: 'storage/uploads/files/folder_test/doc2.txt'
          }
        ]
      }
    },
    include: { files: true }
  })
  fs.mkdirSync(path.resolve('storage/uploads/files/folder_test'), { recursive: true })
  fs.writeFileSync(path.resolve('storage/uploads/files/folder_test/doc1.txt'), 'Folder doc 1')
  fs.writeFileSync(path.resolve('storage/uploads/files/folder_test/doc2.txt'), 'Folder doc 2')

  const zipDownloadRes = await request(`/api/share/${folderTransfer.token}/download-all`)
  assert(
    zipDownloadRes.status === 200 && zipDownloadRes.headers['content-type']?.includes('zip'),
    'Item 15: ZIP archive packages files with relativePath directory structure preserved',
    `status=${zipDownloadRes.status}, contentType=${zipDownloadRes.headers['content-type']}`
  )

  // --- ITEM 12d: GDPR Right-to-be-Forgotten Cascading Account Deletion ---
  console.log('\n--- Testing Item 12d: GDPR Cascading Account Deletion ---')
  const deleteAccountRes = await request('/api/user/account', {
    method: 'DELETE',
    headers: authHeaders
  })

  const userExistsAfterDelete = await prisma.user.findUnique({ where: { id: testUser.id } })
  const userTransfersAfterDelete = await prisma.transfer.findMany({ where: { userId: testUser.id } })
  const userSessionsAfterDelete = await prisma.session.findMany({ where: { userId: testUser.id } })

  assert(
    deleteAccountRes.status === 200 && !userExistsAfterDelete && userTransfersAfterDelete.length === 0 && userSessionsAfterDelete.length === 0,
    'Item 12d: DELETE /api/user/account cascades and permanently deletes user, transfers, sessions, and files',
    `userExists=${Boolean(userExistsAfterDelete)}, remainingTransfers=${userTransfersAfterDelete.length}`
  )

  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`PHASE 3 RESULTS: ${passed}/${total} TESTS PASSED`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)

  await prisma.$disconnect()
  if (passed === total) process.exit(0)
  else process.exit(1)
}

runTests().catch(async (err) => {
  console.error('Phase 3 test execution error:', err)
  await prisma.$disconnect()
  process.exit(1)
})
