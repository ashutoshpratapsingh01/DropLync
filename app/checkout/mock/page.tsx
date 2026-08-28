'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { PLANS } from '@/lib/plans'
import {
  ShieldLockIcon,
  CheckCircleIcon,
  ZapIcon,
  DiamondIcon,
  ArrowLeftIcon,
  SpinnerIcon,
  AlertTriangleIcon
} from '@/components/ui/Icons'

function MockCheckoutContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const planId = searchParams.get('plan') || 'pro'
  const billingInterval = searchParams.get('billing') || 'monthly'
  const sessionId = searchParams.get('session_id') || `cs_test_mock_${Date.now()}`

  const plan = PLANS[planId] || PLANS.pro
  const price = billingInterval === 'yearly' ? `$${plan.priceYearly}` : `$${plan.priceMonthly}`
  const intervalLabel = billingInterval === 'yearly' ? 'year' : 'month'

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSimulatePayment() {
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/user/subscription/mock-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: plan.id,
          billingInterval
        })
      })

      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.error || 'Failed to simulate payment')
      }

      router.push(`/dashboard?payment=success&session_id=${sessionId}`)
    } catch (err: any) {
      setError(err.message || 'Payment simulation failed')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0d17', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px', fontFamily: 'var(--font-sans, system-ui, sans-serif)' }}>
      <div style={{ maxWidth: 840, width: '100%', display: 'grid', gridTemplateColumns: '1.1fr 1fr', background: 'var(--card-bg, #111827)', borderRadius: 20, border: '1px solid rgba(255,255,255,0.1)', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        
        {/* Left Side: Order Summary */}
        <div style={{ padding: '36px 32px', background: 'rgba(255,255,255,0.02)', borderRight: '1px solid rgba(255,255,255,0.08)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
              <button
                onClick={() => router.push('/pricing')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.84rem', fontWeight: 600 }}
              >
                <ArrowLeftIcon size={14} />
                <span>Cancel</span>
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3b82f6' }}>
                {plan.id === 'ultra' ? <DiamondIcon size={20} /> : <ZapIcon size={20} />}
              </div>
              <div>
                <span style={{ fontSize: '0.74rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                  Subscribe to DropLync
                </span>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: '#f8fafc', margin: 0 }}>
                  {plan.name} Plan
                </h2>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, margin: '20px 0 16px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#ffffff', letterSpacing: '-0.03em' }}>{price}</span>
              <span style={{ color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>per {intervalLabel}</span>
            </div>

            <div style={{ padding: '14px', borderRadius: 12, background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.2)', marginBottom: 20 }}>
              <div style={{ fontSize: '0.74rem', color: '#60a5fa', fontWeight: 800, textTransform: 'uppercase', marginBottom: 2 }}>Transfer Allowance</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#ffffff' }}>{plan.maxFileSizeDisplay} per transfer</div>
              <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>{plan.tagline}</div>
            </div>

            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {plan.features.slice(0, 4).map((f, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.82rem', color: '#cbd5e1' }}>
                  <CheckCircleIcon size={15} color="#10b981" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>

          <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: '0.76rem' }}>
            <ShieldLockIcon size={14} color="#3b82f6" />
            <span>256-bit encrypted checkout simulator</span>
          </div>
        </div>

        {/* Right Side: Mock Payment Form */}
        <div style={{ padding: '36px 32px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            {/* Dev Mode Banner */}
            <div style={{ padding: '10px 12px', borderRadius: 10, background: 'rgba(234,179,8,0.1)', border: '1px solid rgba(234,179,8,0.25)', marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <AlertTriangleIcon size={16} color="#eab308" />
              <div style={{ fontSize: '0.76rem', color: '#fef08a', lineHeight: 1.45 }}>
                <strong>Local Development Mode</strong>
                <div style={{ color: '#fde047', marginTop: 2 }}>
                  A placeholder Stripe key is configured in <code>.env</code>. You can simulate a successful test payment below or configure a live Stripe key.
                </div>
              </div>
            </div>

            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', marginBottom: 14 }}>
              Payment Details (Simulated)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Card Number</label>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontSize: '0.88rem', letterSpacing: '0.1em' }}>
                  •••• •••• •••• 4242
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Expires</label>
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontSize: '0.88rem' }}>
                    12 / 28
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>CVC</label>
                  <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontSize: '0.88rem' }}>
                    •••
                  </div>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', marginBottom: 4 }}>Country</label>
                <div style={{ padding: '10px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.12)', color: '#ffffff', fontSize: '0.88rem' }}>
                  United States
                </div>
              </div>
            </div>

            {error && (
              <div style={{ marginTop: 12, padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.15)', color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
                {error}
              </div>
            )}
          </div>

          <div style={{ marginTop: 24 }}>
            <button
              onClick={handleSimulatePayment}
              disabled={loading}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: 10,
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.94rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                transition: 'opacity 0.2s'
              }}
            >
              {loading ? (
                <>
                  <SpinnerIcon size={18} />
                  <span>Processing Test Payment...</span>
                </>
              ) : (
                <>
                  <ShieldLockIcon size={16} />
                  <span>Simulate Payment & Upgrade ({price})</span>
                </>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: '0.72rem', color: '#64748b', marginTop: 10 }}>
              Simulates verified Stripe subscription creation without real credit card charges.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function MockCheckoutPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', background: '#0a0d17', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
        <SpinnerIcon size={32} />
      </div>
    }>
      <MockCheckoutContent />
    </Suspense>
  )
}
