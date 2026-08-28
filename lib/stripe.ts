import Stripe from 'stripe'

const stripeSecretKey = process.env.STRIPE_SECRET_KEY || 'sk_test_droplync_default_key'

export const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2023-10-16' as any,
  typescript: true,
})
