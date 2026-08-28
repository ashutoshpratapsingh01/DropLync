import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/utils'
import { PLANS } from '@/lib/plans'
import { stripe } from '@/lib/stripe'
import Stripe from 'stripe'

/**
 * Handles signed server-to-server webhook events from Stripe.
 *
 * CRITICAL SECURITY INVARIANTS:
 * 1. Strictly verifies the raw webhook HMAC-SHA256 signature using Stripe's official SDK:
 *    stripe.webhooks.constructEvent(rawBody, signature, secret)
 * 2. Unsigned, misconfigured, or tampered requests are immediately rejected with 401/400.
 * 3. Enforces atomic idempotency via the WebhookEvent database model (preventing replay attacks & duplicate upgrades).
 * 4. User tier in the database is ONLY updated on a verified 'checkout.session.completed' event.
 */
export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''
  const signatureHeader = req.headers.get('stripe-signature') || req.headers.get('x-stripe-signature')

  if (!signatureHeader) {
    return apiError('Missing webhook signature header', 401)
  }

  if (!webhookSecret) {
    console.error('CRITICAL: STRIPE_WEBHOOK_SECRET is not configured.')
    return apiError('Webhook signing secret not configured on server', 500)
  }

  let event: Stripe.Event

  try {
    const rawBody = await req.text()
    // Official Stripe SDK signature verification
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret)
  } catch (err: any) {
    console.error('Stripe signature verification failed:', err.message)
    return apiError(`Invalid cryptographic webhook signature: ${err.message}`, 401)
  }

  // Idempotency: atomic record insertion to prevent duplicate event processing
  try {
    const existing = await prisma.webhookEvent.findUnique({
      where: { id: event.id }
    })

    if (existing) {
      return apiSuccess({
        received: true,
        idempotentDuplicate: true,
        message: `Event ${event.id} already processed. Skipping duplicate execution.`
      })
    }

    await prisma.webhookEvent.create({
      data: {
        id: event.id,
        type: event.type
      }
    })
  } catch (dbErr: any) {
    // Unique constraint violation (P2002 in Prisma)
    if (dbErr?.code === 'P2002') {
      return apiSuccess({
        received: true,
        idempotentDuplicate: true,
        message: `Concurrent duplicate event ${event.id} detected and discarded.`
      })
    }
    console.error('Error recording webhook idempotency:', dbErr)
    return apiError('Database error processing webhook event', 500)
  }

  // Process ONLY verified checkout.session.completed events
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    const userId = (session.metadata?.userId || session.client_reference_id) as string | undefined
    const planId = (session.metadata?.planId || (session as any).planId) as string | undefined
    const billingInterval = (session.metadata?.billingInterval || 'monthly') as string

    if (!userId || !planId || !PLANS[planId]) {
      console.error('Webhook session missing required metadata:', { userId, planId })
      return apiError('Missing required session metadata (userId, planId)', 400)
    }

    // Calculate expiration date
    const expiresAt = new Date()
    if (billingInterval === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }

    try {
      // Update user plan tier in the database
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          plan: planId,
          planExpiresAt: expiresAt
        }
      })

      // Create permanent audit log
      await prisma.auditLog.create({
        data: {
          userId,
          action: 'SUBSCRIPTION_UPGRADED_VIA_WEBHOOK',
          details: JSON.stringify({
            planId,
            billingInterval,
            stripeSessionId: session.id,
            stripeEventId: event.id,
            verifiedSignature: true,
            updatedAt: new Date().toISOString()
          }),
          ipAddress: req.headers.get('x-forwarded-for') || 'stripe_webhook'
        }
      }).catch(logErr => console.error('AuditLog error:', logErr))

      return apiSuccess({
        received: true,
        status: 'upgraded',
        userId: updatedUser.id,
        newPlan: updatedUser.plan,
        expiresAt: updatedUser.planExpiresAt
      })
    } catch (updateErr: any) {
      console.error(`Failed to update user tier for userId=${userId}:`, updateErr)
      return apiError(`Failed to update user tier in database: ${updateErr.message}`, 500)
    }
  }

  // Acknowledge other event types (e.g. invoice.paid, customer.subscription.updated) without modifying tier
  return apiSuccess({ received: true, ignoredType: event.type })
}
