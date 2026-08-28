export interface PlanConfig {
  id: 'free' | 'pro' | 'ultra' | 'enterprise'
  name: string
  tagline: string
  priceMonthly: number
  priceYearly: number
  maxFileSize: bigint // in bytes
  maxFileSizeDisplay: string
  expiryDays: number
  maxDownloads: number | null
  features: string[]
  badge?: string
  color: string
}

export const PLANS: Record<string, PlanConfig> = {
  free: {
    id: 'free',
    name: 'Free Starter',
    tagline: 'Ideal for occasional quick file transfers',
    priceMonthly: 0,
    priceYearly: 0,
    maxFileSize: BigInt(10) * BigInt(1024 * 1024 * 1024), // 10 GB limit
    maxFileSizeDisplay: '10GB',
    expiryDays: 7,
    maxDownloads: 10,
    color: '#0ea5e9',
    features: [
      'Up to 10GB per transfer (Free Limit)',
      '7-day link automatic expiration',
      'High-speed direct chunk streaming',
      '10 downloads maximum per link',
      'Optional password encryption',
      'No account needed for basic sends'
    ]
  },
  pro: {
    id: 'pro',
    name: 'Pro Creator',
    tagline: 'For creators, freelancers, and power senders',
    priceMonthly: 9,
    priceYearly: 89,
    maxFileSize: BigInt(50) * BigInt(1024 * 1024 * 1024), // 50 GB
    maxFileSizeDisplay: '50GB',
    expiryDays: 30,
    maxDownloads: null,
    badge: 'MOST POPULAR',
    color: '#2563eb',
    features: [
      'Up to 50GB per transfer',
      '30-day link expiration window',
      'Unlimited download count',
      'Real-time download analytics & logs',
      'Priority turbo transfer bandwidth',
      'Password protection & custom titles'
    ]
  },
  ultra: {
    id: 'ultra',
    name: 'Ultra Business',
    tagline: 'For production studios, agencies, and teams',
    priceMonthly: 29,
    priceYearly: 289,
    maxFileSize: BigInt(200) * BigInt(1024 * 1024 * 1024), // 200 GB
    maxFileSizeDisplay: '200GB',
    expiryDays: 90,
    maxDownloads: null,
    badge: 'BEST FOR TEAMS',
    color: '#0284c7',
    features: [
      'Up to 200GB per transfer',
      '90-day link retention period',
      'Unlimited downloads & recipients',
      'Custom company branding on share pages',
      'Comprehensive audit logs & IP tracking',
      'Developer API access & webhook events'
    ]
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise Infinity',
    tagline: 'Custom cloud infrastructure for organizations',
    priceMonthly: 79,
    priceYearly: 790,
    maxFileSize: BigInt(1000) * BigInt(1024 * 1024 * 1024), // 1 TB
    maxFileSizeDisplay: '1TB+',
    expiryDays: 365,
    maxDownloads: null,
    color: '#059669',
    features: [
      '1TB+ maximum transfer file size',
      '1-year custom retention or permanent storage',
      'Bring Your Own S3 / Azure / GCP Bucket',
      'Custom vanity domain (files.yourcompany.com)',
      'SAML SSO & team workspace management',
      '24/7 dedicated engineering support'
    ]
  }
}

export const FREE_LIMIT_BYTES = BigInt(10) * BigInt(1024 * 1024 * 1024) // 10 GB

export function getPlanConfig(planId?: string | null): PlanConfig {
  if (!planId) return PLANS.free
  return PLANS[planId] || PLANS.free
}

export function getMaxUploadLimitForUser(userPlan?: string | null): { maxBytes: bigint; planName: string; maxDisplay: string; planId: string } {
  const plan = getPlanConfig(userPlan)
  return {
    maxBytes: plan.maxFileSize,
    planName: plan.name,
    maxDisplay: plan.maxFileSizeDisplay,
    planId: plan.id
  }
}
