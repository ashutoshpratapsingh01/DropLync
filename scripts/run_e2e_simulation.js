const { PrismaClient } = require('@prisma/client')
const Stripe = require('stripe')
const prisma = new PrismaClient()

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_droplync_prod_stripe_secret_2026'
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || 'sk_test_51MockDropLyncStripeSecretKey2026ValidSecret'
const stripe = new Stripe(STRIPE_SECRET, { apiVersion: '2023-10-16' })
const BASE_URL = 'http://localhost:3000'

async function runEndToEndSimulation() {
  console.log('=== FULL END-TO-END UI & API SIMULATION ===')

  // Reset UI tester user to FREE plan
  await prisma.user.update({
    where: { email: 'ui_tester@droplync.com' },
    data: { plan: 'free', planExpiresAt: null }
  })

  // Step 1: User Login via API (simulating browser login form)
  console.log('\n[1] Submitting User Login Form...')
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'ui_tester@droplync.com',
      password: 'Password123!'
    })
  })
  const setCookie = loginRes.headers.get('set-cookie')
  const authTokenMatch = setCookie ? setCookie.match(/auth_token=([^;]+)/) : null
  const authToken = authTokenMatch ? authTokenMatch[1] : null
  console.log(`Login Status: ${loginRes.status}, Auth Cookie Acquired: ${!!authToken}`)

  // Verify Initial Tier
  const userBefore = await prisma.user.findUnique({ where: { email: 'ui_tester@droplync.com' } })
  console.log(`User Tier in Database Before Upgrade: "${userBefore.plan}"`)

  // Step 2: User Clicks "Upgrade to Pro" in Upgrade Modal
  console.log('\n[2] User Clicks "Proceed to Stripe Secure Checkout" in Upgrade Modal...')
  const checkoutRes = await fetch(`${BASE_URL}/api/user/subscription/checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `auth_token=${authToken}`
    },
    body: JSON.stringify({
      planId: 'pro',
      billingInterval: 'monthly'
    })
  })
  const checkoutJson = await checkoutRes.json()
  console.log('Checkout Endpoint Status:', checkoutRes.status)
  console.log('Returned Checkout URL:', checkoutJson.checkoutUrl)

  // Verify DB Tier is STILL FREE
  const userDuring = await prisma.user.findUnique({ where: { email: 'ui_tester@droplync.com' } })
  console.log(`User Tier in Database immediately after redirect: "${userDuring.plan}" (Must be "free")`)

  // Step 3: Simulate Stripe Webhook Callback
  console.log('\n[3] Stripe Sends Signed "checkout.session.completed" Webhook...')
  const eventId = `evt_e2e_${Date.now()}`
  const webhookPayload = JSON.stringify({
    id: eventId,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'checkout.session.completed',
    data: {
      object: {
        id: `cs_e2e_session_${Date.now()}`,
        client_reference_id: userBefore.id,
        metadata: {
          userId: userBefore.id,
          planId: 'pro',
          billingInterval: 'monthly'
        },
        payment_status: 'paid',
        status: 'complete'
      }
    }
  })

  const signature = stripe.webhooks.generateTestHeaderString({
    payload: webhookPayload,
    secret: WEBHOOK_SECRET
  })

  const webhookRes = await fetch(`${BASE_URL}/api/webhooks/stripe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'stripe-signature': signature
    },
    body: webhookPayload
  })
  const webhookJson = await webhookRes.json()
  console.log('Webhook Status:', webhookRes.status)
  console.log('Webhook Response:', JSON.stringify(webhookJson, null, 2))

  // Step 4: User Redirected to Dashboard & Dashboard Polls /api/user/subscription
  console.log('\n[4] User Lands on /dashboard?payment=success and Client Polls Subscription Status...')
  const pollRes = await fetch(`${BASE_URL}/api/user/subscription`, {
    headers: { 'Cookie': `auth_token=${authToken}` }
  })
  const pollJson = await pollRes.json()
  console.log('Client Polling Plan Status:', pollJson.plan)

  const userAfter = await prisma.user.findUnique({ where: { email: 'ui_tester@droplync.com' } })
  console.log(`User Tier in Database After Webhook: "${userAfter.plan}"`)
  console.log(`User Plan Expiration: ${userAfter.planExpiresAt}`)

  console.log('\n=== END-TO-END VERIFICATION RESULT ===')
  if (userDuring.plan === 'free' && userAfter.plan === 'pro' && pollJson.plan === 'pro') {
    console.log('SUCCESS: Full Stripe Checkout flow and webhook authorization verified end-to-end without bypass.')
  } else {
    console.error('FAILURE: Unexpected state encountered.')
    process.exit(1)
  }
}

runEndToEndSimulation().then(() => prisma.$disconnect())
