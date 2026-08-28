import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { apiError, apiSuccess, checkRateLimit } from '@/lib/utils'
import { PLANS, getPlanConfig } from '@/lib/plans'
import { stripe } from '@/lib/stripe'
import crypto from 'crypto'

export async function GET() {
  try {
    const user = await getSession()
    const userPlan = (user as any)?.plan || 'free'
    const planConfig = getPlanConfig(userPlan)

    return apiSuccess({
      authenticated: !!user,
      plan: userPlan,
      planDetails: {
        name: planConfig.name,
        maxDisplay: planConfig.maxFileSizeDisplay,
        expiryDays: planConfig.expiryDays,
        features: planConfig.features
      },
      availablePlans: Object.values(PLANS).map(p => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline,
        priceMonthly: p.priceMonthly,
        priceYearly: p.priceYearly,
        maxFileSizeDisplay: p.maxFileSizeDisplay,
        expiryDays: p.expiryDays,
        features: p.features,
        badge: p.badge,
        color: p.color
      }))
    })
  } catch (err: any) {
    return apiError(err.message || 'Failed to fetch subscription info', 500)
  }
}

/**
 * Initiates a real Stripe Checkout Session for a subscription plan upgrade.
 * CRITICAL SECURITY INVARIANT:
 * This endpoint NEVER modifies the user's plan or tier in the database (not even optimistically).
 * The user MUST be redirected to the Stripe-hosted checkout page.
 * The plan tier is ONLY updated when a cryptographically verified webhook event
 * (checkout.session.completed) is received by /api/webhooks/stripe.
 */
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  if (!checkRateLimit(`sub_checkout:${ip}`, 10, 60000)) return apiError('Too many requests', 429)

  try {
    const user = await getSession()
    if (!user) {
      return apiError('Please sign in or create an account to upgrade your subscription', 401)
    }

    const { planId, billingInterval = 'monthly' } = await req.json()

    if (!planId || !PLANS[planId]) {
      return apiError('Invalid subscription plan selected', 400)
    }

    if (planId === 'free') {
      return apiError('You are already on the free tier', 400)
    }

    const targetPlan = PLANS[planId]
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const amountInCents = (billingInterval === 'yearly' ? targetPlan.priceYearly : targetPlan.priceMonthly) * 100

    let checkoutUrl: string
    let sessionId: string

    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `DropLync ${targetPlan.name} Subscription`,
                description: `${targetPlan.maxFileSizeDisplay} maximum transfer size with priority features.`,
              },
              unit_amount: amountInCents,
              recurring: {
                interval: billingInterval === 'yearly' ? 'year' : 'month',
              },
            },
            quantity: 1,
          },
        ],
        mode: 'subscription',
        client_reference_id: user.id,
        customer_email: user.email,
        metadata: {
          userId: user.id,
          userEmail: user.email,
          planId: targetPlan.id,
          billingInterval,
        },
        success_url: `${appUrl}/dashboard?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/pricing?payment=cancelled`,
      })
      checkoutUrl = session.url || `https://checkout.stripe.com/pay/${session.id}`
      sessionId = session.id
    } catch (stripeErr: any) {
      console.warn('Stripe checkout session creation failed:', stripeErr.message || stripeErr)
      // In local dev/test environments with placeholder mock credentials if Stripe API call fails auth:
      if (
        !process.env.STRIPE_SECRET_KEY ||
        process.env.STRIPE_SECRET_KEY.includes('Mock') ||
        stripeErr.type === 'StripeAuthenticationError'
      ) {
        sessionId = `cs_test_${crypto.randomBytes(16).toString('hex')}`
        checkoutUrl = `${appUrl}/checkout/mock?session_id=${sessionId}&plan=${targetPlan.id}&billing=${billingInterval}`
      } else {
        throw stripeErr
      }
    }

    return apiSuccess({
      message: 'Stripe Checkout session created. Redirecting to Stripe...',
      sessionId,
      checkoutUrl
    })
  } catch (err: any) {
    console.error('Subscription checkout error:', err)
    return apiError(err.message || 'Failed to initiate checkout', 500)
  }
}
