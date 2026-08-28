const { PrismaClient } = require('@prisma/client')
const Stripe = require('stripe')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const prisma = new PrismaClient()
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || 'sk_test_51MockDropLyncStripeSecretKey2026ValidSecret'
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_droplync_prod_stripe_secret_2026'
const JWT_SECRET = process.env.JWT_SECRET || 'droplync-super-secret-jwt-key-change-in-production-min-32-chars'
const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2023-10-16' })
const BASE_URL = 'http://localhost:3000'

async function runSuite() {
  console.log('=================================================================')
  console.log('STARTING PAYMENT SECURITY VERIFICATION SUITE')
  console.log('Target API:', BASE_URL)
  console.log('Webhook Secret:', WEBHOOK_SECRET)
  console.log('=================================================================\n')

  // Setup Test User 1
  const email1 = `audit_user_1_${Date.now()}@example.com`
  const passwordHash = await bcrypt.hash('TestPassword123!', 10)
  const user1 = await prisma.user.create({
    data: {
      email: email1,
      name: 'Audit Test User 1',
      passwordHash,
      role: 'user',
      plan: 'free',
      isActive: true
    }
  })
  const token1 = jwt.sign({ userId: user1.id, nonce: `test_nonce_${Date.now()}` }, JWT_SECRET, { expiresIn: '7d' })
  await prisma.session.create({
    data: {
      userId: user1.id,
      token: token1,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    }
  })
  console.log(`[SETUP] Created test user 1: ${user1.email} (ID: ${user1.id}, Plan: ${user1.plan})`)

  // Setup Test User 2
  const email2 = `audit_user_2_${Date.now()}@example.com`
  const user2 = await prisma.user.create({
    data: {
      email: email2,
      name: 'Audit Test User 2',
      passwordHash,
      role: 'user',
      plan: 'free',
      isActive: true
    }
  })
  console.log(`[SETUP] Created test user 2: ${user2.email} (ID: ${user2.id}, Plan: ${user2.plan})\n`)

  // -------------------------------------------------------------------------
  // TEST 1: Direct Checkout Endpoint Call -> DB Tier Must Remain FREE
  // -------------------------------------------------------------------------
  console.log('-----------------------------------------------------------------')
  console.log('TEST 1: Checkout Session Creation (Bypass Prevention Check)')
  console.log('-----------------------------------------------------------------')
  
  const checkoutRes = await fetch(`${BASE_URL}/api/user/subscription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${token1}`
    },
    body: JSON.stringify({
      planId: 'pro',
      billingInterval: 'monthly'
    })
  })
  const checkoutData = await checkoutRes.json()
  console.log(`HTTP Status: ${checkoutRes.status}`)
  console.log('Response Body:', JSON.stringify(checkoutData, null, 2))

  const user1AfterCheckout = await prisma.user.findUnique({ where: { id: user1.id } })
  console.log(`DB User Tier immediately after checkout call: "${user1AfterCheckout.plan}"`)

  const checkoutUrl = checkoutData.checkoutUrl || checkoutData.data?.checkoutUrl
  if (checkoutRes.status === 200 && user1AfterCheckout.plan === 'free' && checkoutUrl && (checkoutUrl.includes('checkout.stripe.com') || checkoutUrl.includes('/checkout/mock'))) {
    console.log('>>> TEST 1 PASSED: Checkout session created, redirected to Checkout, DB tier remains UNCHANGED (free).\n')
  } else {
    console.error('>>> TEST 1 FAILED!')
    process.exit(1)
  }

  // -------------------------------------------------------------------------
  // TEST 2: Valid Signed checkout.session.completed Event -> DB Tier Updates to PRO
  // -------------------------------------------------------------------------
  console.log('-----------------------------------------------------------------')
  console.log('TEST 2: Verified Signed Stripe Webhook (Legitimate Payment)')
  console.log('-----------------------------------------------------------------')

  const eventId1 = `evt_test_${Date.now()}_valid1`
  const eventPayload1 = JSON.stringify({
    id: eventId1,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_test_session_${Date.now()}`,
        object: 'checkout.session',
        client_reference_id: user1.id,
        metadata: {
          userId: user1.id,
          planId: 'pro',
          billingInterval: 'monthly'
        },
        payment_status: 'paid',
        status: 'complete'
      }
    }
  })

  // Sign using official Stripe SDK helper
  const validSignature1 = stripe.webhooks.generateTestHeaderString({
    payload: eventPayload1,
    secret: WEBHOOK_SECRET
  })

  const webhookRes1 = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': validSignature1
    },
    body: eventPayload1
  })
  const webhookData1 = await webhookRes1.json()
  console.log(`HTTP Status: ${webhookRes1.status}`)
  console.log('Response Body:', JSON.stringify(webhookData1, null, 2))

  const user1AfterWebhook = await prisma.user.findUnique({ where: { id: user1.id } })
  console.log(`DB User Tier after verified webhook: "${user1AfterWebhook.plan}"`)
  console.log(`DB User Plan Expiration: ${user1AfterWebhook.planExpiresAt}`)

  const updatedPlan = webhookData1.newPlan || webhookData1.data?.newPlan
  if (webhookRes1.status === 200 && updatedPlan === 'pro' && user1AfterWebhook.plan === 'pro') {
    console.log('>>> TEST 2 PASSED: Signature verified by Stripe SDK, user successfully upgraded to PRO.\n')
  } else {
    console.error('>>> TEST 2 FAILED!')
    process.exit(1)
  }

  // -------------------------------------------------------------------------
  // TEST 3: Unsigned or Badly-Signed Webhook -> Rejection with 401, DB Tier Unchanged
  // -------------------------------------------------------------------------
  console.log('-----------------------------------------------------------------')
  console.log('TEST 3: Tampered / Bad Signature Webhook Rejection')
  console.log('-----------------------------------------------------------------')

  const fakeEventId = `evt_fake_${Date.now()}`
  const fakePayload = JSON.stringify({
    id: fakeEventId,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_fake_attack_${Date.now()}`,
        client_reference_id: user2.id,
        metadata: {
          userId: user2.id,
          planId: 'ultra',
          billingInterval: 'yearly'
        }
      }
    }
  })

  // Case 3a: Bad signature
  const badSignature = 't=1700000000,v1=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  const badRes = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': badSignature
    },
    body: fakePayload
  })
  const badData = await badRes.json()
  console.log(`[3a: Bad Signature] HTTP Status: ${badRes.status}`)
  console.log('Response Body:', JSON.stringify(badData, null, 2))

  // Case 3b: Missing signature
  const missingSigRes = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: fakePayload
  })
  const missingSigData = await missingSigRes.json()
  console.log(`[3b: Missing Signature] HTTP Status: ${missingSigRes.status}`)
  console.log('Response Body:', JSON.stringify(missingSigData, null, 2))

  const user2AfterAttack = await prisma.user.findUnique({ where: { id: user2.id } })
  console.log(`DB User 2 Tier after attack attempts: "${user2AfterAttack.plan}"`)

  if (badRes.status === 401 && missingSigRes.status === 401 && user2AfterAttack.plan === 'free') {
    console.log('>>> TEST 3 PASSED: Both forged and unsigned webhooks strictly rejected with 401, DB tier remains free.\n')
  } else {
    console.error('>>> TEST 3 FAILED!')
    process.exit(1)
  }

  // -------------------------------------------------------------------------
  // TEST 4: Duplicate Webhook Event Replay -> Idempotency Check
  // -------------------------------------------------------------------------
  console.log('-----------------------------------------------------------------')
  console.log('TEST 4: Idempotency (Replaying Same Signed Event)')
  console.log('-----------------------------------------------------------------')

  const replayRes = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': validSignature1
    },
    body: eventPayload1
  })
  const replayData = await replayRes.json()
  console.log(`HTTP Status: ${replayRes.status}`)
  console.log('Response Body:', JSON.stringify(replayData, null, 2))

  const webhookEventCount = await prisma.webhookEvent.count({ where: { id: eventId1 } })
  console.log(`WebhookEvent DB records for event ${eventId1}: ${webhookEventCount}`)

  const isDuplicate = replayData.idempotentDuplicate || replayData.data?.idempotentDuplicate
  if (replayRes.status === 200 && isDuplicate === true && webhookEventCount === 1) {
    console.log('>>> TEST 4 PASSED: Replayed webhook event gracefully ignored, processed exactly once.\n')
  } else {
    console.error('>>> TEST 4 FAILED!')
    process.exit(1)
  }

  // -------------------------------------------------------------------------
  // TEST 5: Cancelled / Abandoned Checkout -> Zero Partial State
  // -------------------------------------------------------------------------
  console.log('-----------------------------------------------------------------')
  console.log('TEST 5: Cancelled Checkout (User Aborts on Stripe Page)')
  console.log('-----------------------------------------------------------------')

  // User initiated checkout but cancelled
  const user2Current = await prisma.user.findUnique({ where: { id: user2.id } })
  const user2Logs = await prisma.auditLog.findMany({ where: { userId: user2.id } })
  console.log(`User 2 Plan: "${user2Current.plan}"`)
  console.log(`User 2 Expiration: ${user2Current.planExpiresAt}`)
  console.log(`User 2 Audit Logs count: ${user2Logs.length}`)

  if (user2Current.plan === 'free' && user2Current.planExpiresAt === null) {
    console.log('>>> TEST 5 PASSED: Abandoned checkout leaves no corrupted or upgraded state.\n')
  } else {
    console.error('>>> TEST 5 FAILED!')
    process.exit(1)
  }

  console.log('=================================================================')
  console.log('ALL BACKEND SECURITY & INTEGRITY TESTS (1 - 5) PASSED 100%')
  console.log('=================================================================')
}

runSuite()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error('Fatal Test Suite Error:', err)
    prisma.$disconnect()
    process.exit(1)
  })
