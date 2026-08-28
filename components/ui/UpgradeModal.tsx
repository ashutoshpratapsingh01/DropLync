'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Tilt3D from '@/components/ui/Tilt3D'
import {
  CheckIcon,
  XIcon,
  AlertTriangleIcon,
  SpinnerIcon,
  ArrowRightIcon,
  LockIcon
} from '@/components/ui/Icons'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentFileSizeDisplay?: string
  currentLimitDisplay?: string
  defaultPlan?: 'pro' | 'ultra' | 'enterprise'
  onSuccess?: () => void
}

export default function UpgradeModal({
  isOpen,
  onClose,
  currentFileSizeDisplay,
  currentLimitDisplay = '10GB',
  defaultPlan = 'pro',
  onSuccess
}: UpgradeModalProps) {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'ultra' | 'enterprise'>(defaultPlan)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const PLANS_INFO = [
    {
      id: 'pro' as const,
      name: 'Pro Creator',
      storage: '50 GB',
      price: billing === 'monthly' ? '$9' : '$89',
      period: billing === 'monthly' ? '/month' : '/year',
      popular: true,
      features: [
        '50GB Max Transfer Size',
        '30-Day Link Validity',
        'Unlimited Downloads',
        'Priority Bandwidth Streaming'
      ]
    },
    {
      id: 'ultra' as const,
      name: 'Ultra Business',
      storage: '200 GB',
      price: billing === 'monthly' ? '$29' : '$289',
      period: billing === 'monthly' ? '/month' : '/year',
      popular: false,
      features: [
        '200GB Max Transfer Size',
        '90-Day Link Retention',
        'Custom Brand Logo & Wallpaper',
        'Audit Logs & Developer API'
      ]
    }
  ]

  async function handleProceedToCheckout() {
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/user/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan,
          billingInterval: billing
        })
      })

      const json = await res.json()

      if (!res.ok) {
        setLoading(false)
        if (res.status === 401) {
          router.push('/login?redirect=pricing')
          return
        }
        throw new Error(json.error || 'Failed to initiate Stripe Checkout session')
      }

      const checkoutUrl = json.checkoutUrl || json.data?.checkoutUrl || json.data?.checkout?.checkoutUrl
      if (!checkoutUrl) {
        throw new Error('Invalid checkout session received from server')
      }

      // CRITICAL: Redirect user directly to the official Stripe-hosted payment page.
      // Card details are never collected or handled in-app.
      window.location.href = checkoutUrl
    } catch (err: any) {
      setLoading(false)
      setError(err.message || 'Unable to connect to Stripe payment gateway')
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(6, 9, 18, 0.85)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16
    }}>
      <div style={{ width: '100%', maxWidth: 680 }}>
        <Tilt3D intensity={4} glare={true} className="glass-panel" style={{
          padding: '32px 28px',
          borderRadius: 24,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.8)'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: 'rgba(37, 99, 235, 0.15)',
                  color: '#60a5fa',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  border: '1px solid rgba(37, 99, 235, 0.3)'
                }}>
                  Official Stripe Hosted Checkout
                </span>
                <h2 style={{ fontSize: '1.7rem', fontWeight: 900, color: 'var(--text-1)', marginTop: 8, letterSpacing: '-0.02em' }}>
                  Upgrade Transfer Capacity
                </h2>
                {currentFileSizeDisplay && (
                  <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginTop: 4 }}>
                    Your payload ({currentFileSizeDisplay}) exceeds the current {currentLimitDisplay} limit.
                  </p>
                )}
              </div>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: 10,
                  width: 34,
                  height: 34,
                  color: 'var(--text-2)',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <XIcon size={16} />
              </button>
            </div>

            {/* Billing interval switcher */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 22 }}>
              <div style={{
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: 999,
                padding: 4,
                display: 'flex'
              }}>
                <button
                  type="button"
                  onClick={() => setBilling('monthly')}
                  style={{
                    padding: '6px 18px',
                    borderRadius: 999,
                    border: 'none',
                    background: billing === 'monthly' ? 'var(--brand)' : 'transparent',
                    color: billing === 'monthly' ? '#fff' : 'var(--text-2)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setBilling('yearly')}
                  style={{
                    padding: '6px 18px',
                    borderRadius: 999,
                    border: 'none',
                    background: billing === 'yearly' ? 'var(--brand)' : 'transparent',
                    color: billing === 'yearly' ? '#fff' : 'var(--text-2)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  Yearly
                  <span style={{
                    background: '#10b981',
                    color: '#fff',
                    fontSize: '0.66rem',
                    padding: '1px 6px',
                    borderRadius: 999,
                    fontWeight: 800
                  }}>
                    SAVE 18%
                  </span>
                </button>
              </div>
            </div>

            {/* Plan selection cards */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 22 }}>
              {PLANS_INFO.map(p => (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  style={{
                    cursor: 'pointer',
                    padding: '20px 18px',
                    borderRadius: 18,
                    background: selectedPlan === p.id ? 'rgba(37, 99, 235, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                    border: selectedPlan === p.id ? '2px solid var(--brand)' : '1px solid rgba(255, 255, 255, 0.08)',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                >
                  {p.popular && (
                    <span style={{
                      position: 'absolute', top: -10, right: 14,
                      padding: '3px 10px', borderRadius: 999, background: 'var(--brand)',
                      color: 'white', fontSize: '0.68rem', fontWeight: 800
                    }}>
                      POPULAR
                    </span>
                  )}
                  <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase' }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-1)', margin: '4px 0 2px' }}>
                    {p.storage}
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--brand)', marginBottom: 14 }}>
                    {p.price} <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 500 }}>{p.period}</span>
                  </div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {p.features.map((f, i) => (
                      <li key={i} style={{ fontSize: '0.8rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckIcon size={14} color="#10b981" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {error && (
              <div style={{
                marginBottom: 18,
                padding: '10px 14px',
                borderRadius: 10,
                background: 'rgba(220, 38, 38, 0.15)',
                border: '1px solid rgba(220, 38, 38, 0.3)',
                color: '#f87171',
                fontSize: '0.86rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <AlertTriangleIcon size={16} color="#f87171" />
                <span>{error}</span>
              </div>
            )}

            {/* Secure Checkout CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button
                type="button"
                onClick={handleProceedToCheckout}
                disabled={loading}
                className="btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  fontSize: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10
                }}
              >
                {loading ? (
                  <>
                    <SpinnerIcon size={18} />
                    <span>Redirecting to Stripe...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Stripe Secure Checkout</span>
                    <ArrowRightIcon size={16} />
                  </>
                )}
              </button>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                color: 'var(--text-3)',
                fontSize: '0.76rem'
              }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <LockIcon size={12} />
                  <span>256-bit SSL Encrypted</span>
                </span>
                <span>•</span>
                <span>PCI-DSS Compliant via Stripe</span>
                <span>•</span>
                <span>Cancel Anytime</span>
              </div>
            </div>

          </div>
        </Tilt3D>
      </div>
    </div>
  )
}
