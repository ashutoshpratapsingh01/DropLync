'use client'
import { useEffect, useRef } from 'react'

interface AdBannerProps {
  slotId?: string
  format?: 'horizontal' | 'rectangle' | 'responsive'
  className?: string
  style?: React.CSSProperties
}

export default function AdBanner({
  slotId = 'default',
  format = 'horizontal',
  className = '',
  style = {}
}: AdBannerProps) {
  const adRef = useRef<HTMLDivElement>(null)
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  useEffect(() => {
    if (typeof window !== 'undefined' && adsenseClientId) {
      try {
        // Push ad to Google AdSense queue if available
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({})
      } catch (e) {
        console.warn('AdSense render notice:', e)
      }
    }
  }, [adsenseClientId])

  // If real Google AdSense is configured via env, render the official AdSense unit
  if (adsenseClientId) {
    return (
      <div
        className={`ad-container ${className}`}
        style={{
          width: '100%',
          overflow: 'hidden',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: format === 'horizontal' ? 90 : 250,
          margin: '16px 0',
          ...style
        }}
      >
        <ins
          className="adsbygoogle"
          style={{ display: 'block', width: '100%', textAlign: 'center' }}
          data-ad-client={adsenseClientId}
          data-ad-slot={slotId}
          data-ad-format={format === 'horizontal' ? 'horizontal' : 'auto'}
          data-full-width-responsive="true"
        />
      </div>
    )
  }

  // High-converting sleek native sponsor slot (displayed before AdSense is connected)
  return (
    <div
      ref={adRef}
      className={`card-soft ${className}`}
      style={{
        width: '100%',
        padding: '12px 18px',
        borderRadius: 14,
        background: 'linear-gradient(135deg, rgba(37,99,235,0.06) 0%, rgba(2,132,199,0.03) 100%)',
        border: '1px solid rgba(37,99,235,0.18)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxSizing: 'border-box',
        margin: '14px 0',
        ...style
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 200, flex: '1 1 auto' }}>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: 'linear-gradient(135deg, #2563eb, #0284c7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontSize: '1rem',
            fontWeight: 900,
            boxShadow: '0 4px 10px rgba(37,99,235,0.3)',
            flexShrink: 0
          }}
        >
          ⚡
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-1)' }}>
              Send Up to 50GB & 200GB Files
            </span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 800,
                textTransform: 'uppercase',
                padding: '2px 6px',
                borderRadius: 4,
                background: 'rgba(37,99,235,0.15)',
                color: 'var(--brand)',
                letterSpacing: '0.04em'
              }}
            >
              Sponsored
            </span>
          </div>
          <p style={{ fontSize: '0.74rem', color: 'var(--text-3)', margin: '2px 0 0', lineHeight: 1.3 }}>
            Upgrade to DropLync Pro for unlimited downloads, custom passwords & 90-day vaults.
          </p>
        </div>
      </div>

      <a
        href="/pricing"
        className="btn-primary"
        style={{
          padding: '7px 14px',
          fontSize: '0.78rem',
          fontWeight: 800,
          borderRadius: 8,
          textDecoration: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          flexShrink: 0
        }}
      >
        <span>Explore Pro ($9)</span>
        <span style={{ fontSize: '0.85rem' }}>→</span>
      </a>
    </div>
  )
}
