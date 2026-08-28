'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import Tilt3D from '@/components/ui/Tilt3D'
import Background3D from '@/components/Background3D'
import UpgradeModal from '@/components/ui/UpgradeModal'
import { CheckIcon } from '@/components/ui/Icons'

export default function PricingClient({ user }: { user?: any }) {
  useScrollReveal()
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'ultra' | 'enterprise'>('pro')

  function handleSelectPlan(planId: 'free' | 'pro' | 'ultra' | 'enterprise') {
    if (planId === 'free') {
      router.push('/')
      return
    }
    if (planId === 'enterprise') {
      alert('Enterprise Sales: Please contact enterprise@droplync.com for dedicated infrastructure & custom SLA.')
      return
    }
    setSelectedPlan(planId)
    setModalOpen(true)
  }

  const currentPlan = user?.plan || 'free'

  const PLANS = [
    {
      id: 'free' as const,
      name: 'Free Starter',
      tagline: 'Instant basic transfers with zero friction',
      price: '$0',
      period: 'forever',
      storageLimit: '10 GB',
      storageDesc: 'Free upload limit per transfer',
      badge: null,
      color: '#0ea5e9',
      features: [
        'Up to 10GB per transfer',
        '7-day link expiration',
        'Direct chunk streaming',
        '10 downloads per link',
        'Password protection',
        'Standard bandwidth'
      ],
      cta: currentPlan === 'free' ? 'Current Plan' : 'Free Tier',
      isCurrent: currentPlan === 'free'
    },
    {
      id: 'pro' as const,
      name: 'Pro Creator',
      tagline: 'For creators, filmmakers & professionals',
      price: billing === 'monthly' ? '$9' : '$89',
      period: billing === 'monthly' ? '/mo' : '/yr',
      storageLimit: '50 GB',
      storageDesc: '5x higher limit for 4K video & assets',
      badge: 'MOST POPULAR',
      color: '#2563eb',
      featured: true,
      features: [
        'Up to 50GB per transfer',
        '30-day link expiration',
        'Unlimited download count',
        'Download analytics & IP logs',
        'Priority turbo streaming',
        'Custom password protection'
      ],
      cta: currentPlan === 'pro' ? 'Current Plan' : 'Upgrade to Pro',
      isCurrent: currentPlan === 'pro'
    },
    {
      id: 'ultra' as const,
      name: 'Ultra Business',
      tagline: 'For studios, agencies & teams',
      price: billing === 'monthly' ? '$29' : '$289',
      period: billing === 'monthly' ? '/mo' : '/yr',
      storageLimit: '200 GB',
      storageDesc: 'Massive archives & multi-cam projects',
      badge: 'POWER TEAMS',
      color: '#0284c7',
      features: [
        'Up to 200GB per transfer',
        '90-day retention window',
        'Unlimited downloads & recipients',
        'Custom brand logo & colors',
        'Full security audit history',
        'Developer API & webhooks'
      ],
      cta: currentPlan === 'ultra' ? 'Current Plan' : 'Upgrade to Ultra',
      isCurrent: currentPlan === 'ultra'
    },
    {
      id: 'enterprise' as const,
      name: 'Enterprise',
      tagline: 'Dedicated cloud infrastructure & retention',
      price: billing === 'monthly' ? '$79' : '$790',
      period: billing === 'monthly' ? '/mo' : '/yr',
      storageLimit: '1 TB+',
      storageDesc: 'Unlimited custom cloud pipeline',
      badge: null,
      color: '#059669',
      features: [
        '1TB+ unlimited file transfer sizes',
        'Permanent or 1-year custom retention',
        'Bring Your Own S3/Azure Bucket',
        'Custom vanity domain',
        'SAML SSO & team workspace access',
        '24/7 dedicated engineering support'
      ],
      cta: 'Contact Sales',
      isCurrent: currentPlan === 'enterprise'
    }
  ]

  return (
    <main style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', padding: '36px 0 64px' }}>
      <Background3D />

      <div className="section-container">
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span className="badge badge-active" style={{ marginBottom: 8, padding: '4px 12px', fontSize: '0.78rem' }}>
            STORAGE TIERS & SUBSCRIPTION
          </span>
          <h1 style={{ fontSize: 'clamp(2rem, 3.4vw, 2.7rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 10, color: 'var(--text-1)' }}>
            Transparent pricing based on <span className="gradient-text">your transfer needs</span>
          </h1>
          <p style={{ color: 'var(--text-2)', fontSize: '0.96rem', maxWidth: 560, margin: '0 auto 20px', lineHeight: 1.6 }}>
            Upload up to <strong>10 GB free</strong> without an account. Upgrade anytime to transfer massive <strong>50 GB, 200 GB, or 1 TB+</strong> datasets with turbo bandwidth.
          </p>

          {/* Billing Switch */}
          <div style={{ display: 'inline-flex', background: 'var(--glass-bg-subtle)', padding: 4, borderRadius: 12, border: '1.5px solid var(--border-glass)' }}>
            <button
              onClick={() => setBilling('monthly')}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: billing === 'monthly' ? 'var(--brand)' : 'transparent',
                color: billing === 'monthly' ? 'white' : 'var(--text-2)',
                fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: billing === 'monthly' ? 'var(--shadow-brand)' : 'none'
              }}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBilling('yearly')}
              style={{
                padding: '8px 18px', borderRadius: 8, border: 'none',
                background: billing === 'yearly' ? 'var(--brand)' : 'transparent',
                color: billing === 'yearly' ? 'white' : 'var(--text-2)',
                fontWeight: 700, fontSize: '0.86rem', cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: billing === 'yearly' ? 'var(--shadow-brand)' : 'none',
                display: 'flex', alignItems: 'center', gap: 6
              }}
            >
              Yearly Billing
              <span style={{ padding: '2px 6px', borderRadius: 999, background: '#059669', color: 'white', fontSize: '0.68rem', fontWeight: 800 }}>SAVE 20%</span>
            </button>
          </div>
        </div>

        {/* 4 Plan Cards Grid */}
        <div className="responsive-grid-4" style={{ marginBottom: 48 }}>
          {PLANS.map((plan, i) => (
            <Tilt3D key={plan.id} intensity={4}>
              <div
                className={`card card-hover reveal reveal-delay-${i + 1} ${plan.featured ? 'pricing-featured' : ''}`}
                style={{
                  padding: '24px 20px',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  overflow: 'hidden',
                  minHeight: 460,
                  borderColor: plan.featured ? 'var(--brand)' : 'var(--border-glass)'
                }}
              >
                {plan.featured && (
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(90deg, #2563eb, #0284c7, #06b6d4)' }} />
                )}
                {plan.badge && (
                  <span style={{
                    position: 'absolute', top: 16, right: 16,
                    padding: '2px 8px', borderRadius: 999,
                    background: plan.featured ? 'var(--brand)' : 'var(--bg-muted)',
                    color: plan.featured ? 'white' : 'var(--text-2)',
                    fontSize: '0.66rem', fontWeight: 800, letterSpacing: '0.04em'
                  }}>
                    {plan.badge}
                  </span>
                )}

                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 8 }}>
                  {plan.name}
                </div>

                {/* Storage highlight box */}
                <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(37,99,235,0.08)', border: '1px solid var(--border)', marginBottom: 14 }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 800, textTransform: 'uppercase' }}>Transfer Boundary</div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--brand)' }}>{plan.storageLimit}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-2)', marginTop: 1 }}>{plan.storageDesc}</div>
                </div>

                {/* Pricing number */}
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 4 }}>
                  <span style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-1)' }}>{plan.price}</span>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-3)', fontWeight: 600 }}>{plan.period}</span>
                </div>
                <p style={{ color: 'var(--text-2)', fontSize: '0.8rem', minHeight: 34, marginBottom: 16, lineHeight: 1.4 }}>{plan.tagline}</p>

                <div className="divider" style={{ marginBottom: 16 }} />

                {/* Features list */}
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 22px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {plan.features.map((f, idx) => (
                    <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: 'var(--text-1)', fontWeight: 600, lineHeight: 1.35 }}>
                      <CheckIcon size={14} color="#059669" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={plan.isCurrent}
                  className={plan.featured ? 'btn-primary' : 'btn-secondary'}
                  style={{ width: '100%', padding: '10px', fontSize: '0.88rem' }}
                >
                  {plan.cta}
                </button>
              </div>
            </Tilt3D>
          ))}
        </div>

        {/* Comparison Matrix */}
        <div className="glass-panel" style={{ padding: '24px 18px', overflow: 'hidden' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 900, marginBottom: 4, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            Detailed Storage & Capability Matrix
          </h2>
          <p style={{ color: 'var(--text-2)', marginBottom: 20, fontSize: '0.88rem' }}>Compare features and limits side by side.</p>

          <div className="table-responsive-wrapper">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1.5px solid var(--border)', background: 'var(--glass-bg-subtle)' }}>
                  <th style={{ padding: '12px 14px', textAlign: 'left', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-3)' }}>FEATURE</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-3)' }}>FREE</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.76rem', fontWeight: 800, color: 'var(--brand)' }}>PRO (50GB)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-3)' }}>ULTRA (200GB)</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-3)' }}>ENTERPRISE</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Maximum file size per transfer', '10 GB', '50 GB', '200 GB', '1 TB+ Unlimited'],
                  ['Link expiration duration', '7 Days', '30 Days', '90 Days', '365 Days / Permanent'],
                  ['Download limit per link', '10 Downloads', 'Unlimited', 'Unlimited', 'Unlimited'],
                  ['Bandwidth tier', 'Standard', 'Turbo High-Priority', 'Dedicated Multi-Stream', 'Enterprise Dedicated'],
                  ['Password encryption', 'YES', 'YES', 'YES', 'YES'],
                  ['Download analytics & IP logs', '—', 'YES', 'YES', 'YES'],
                  ['Custom download page branding', '—', '—', 'YES', 'YES'],
                  ['Developer API & Webhooks', '—', '—', 'YES', 'YES'],
                  ['Bring your own S3/Storage', '—', '—', '—', 'YES'],
                ].map(([f, fr, pr, ul, en], idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 14px', fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-1)' }}>{f}</td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-2)' }}>
                      {fr === 'YES' ? <CheckIcon size={15} color="#059669" style={{ margin: '0 auto' }} /> : fr}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.82rem', fontWeight: 800, color: 'var(--brand)' }}>
                      {pr === 'YES' ? <CheckIcon size={15} color="#2563eb" style={{ margin: '0 auto' }} /> : pr}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-2)' }}>
                      {ul === 'YES' ? <CheckIcon size={15} color="#059669" style={{ margin: '0 auto' }} /> : ul}
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-2)' }}>
                      {en === 'YES' ? <CheckIcon size={15} color="#059669" style={{ margin: '0 auto' }} /> : en}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '16px 0', marginTop: 48, background: 'var(--glass-bg-subtle)', backdropFilter: 'blur(16px)' }}>
        <div className="section-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <img src="/logo.svg" alt="DropLync" height={24} style={{ height: 24 }} />
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="/pricing" style={{ fontSize: '0.8rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Pricing & Plans</a>
              <a href="/privacy" style={{ fontSize: '0.8rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
              <a href="/terms" style={{ fontSize: '0.8rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>
              <a href="/security" style={{ fontSize: '0.8rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Security</a>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>© 2026 DropLync. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Interactive Upgrade Modal */}
      <UpgradeModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultPlan={selectedPlan}
        onSuccess={() => {
          setModalOpen(false)
          router.refresh()
        }}
      />
    </main>
  )
}
