'use client'

import { useEffect, useState } from 'react'
import { DownloadCloudIcon, XIcon, CheckCircleIcon } from '@/components/ui/Icons'

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showPrompt, setShowPrompt] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)
  const [installedSuccess, setInstalledSuccess] = useState(false)

  useEffect(() => {
    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => {
          // SW registered cleanly
        })
        .catch((err) => {
          console.debug('SW registration notice:', err)
        })
    }

    // 2. Check if already installed / running in standalone window
    const standaloneMode =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true

    setIsStandalone(standaloneMode)
    if (standaloneMode) return

    // 3. Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase()
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent) && !(window as any).MSStream
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios/.test(userAgent)
    
    // Check if dismissed before
    const isDismissed = localStorage.getItem('droplync_pwa_dismissed')
    if (isDismissed) return

    if (isIosDevice && isSafari) {
      setIsIOS(true)
      // Show subtle iOS banner after 4 seconds of usage
      const timer = setTimeout(() => setShowPrompt(true), 4000)
      return () => clearTimeout(timer)
    }

    // 4. Capture native beforeinstallprompt (Android / Desktop Chrome / Edge)
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      // Show banner after 3 seconds
      setTimeout(() => setShowPrompt(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 5. Listen for appinstalled
    window.addEventListener('appinstalled', () => {
      setShowPrompt(false)
      setInstalledSuccess(true)
      setTimeout(() => setInstalledSuccess(false), 4000)
    })

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  async function handleInstallClick() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  function handleDismiss() {
    setShowPrompt(false)
    localStorage.setItem('droplync_pwa_dismissed', 'true')
  }

  if (isStandalone) return null

  return (
    <>
      {/* Installation Success Toast */}
      {installedSuccess && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9999,
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(5, 150, 105, 0.4)',
            borderRadius: 16,
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            boxShadow: 'var(--shadow-lg)'
          }}
        >
          <CheckCircleIcon size={20} color="#059669" />
          <span style={{ fontSize: '0.86rem', fontWeight: 800, color: 'var(--text-1)' }}>
            DropLync App Installed Successfully!
          </span>
        </div>
      )}

      {/* Floating Installation Banner */}
      {showPrompt && (
        <div className="pwa-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div
              style={{
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              {/* Transparent 3D Quantum Prism Logo */}
              <svg
                viewBox="0 0 52 52"
                fill="none"
                width="38"
                height="38"
                style={{
                  filter: 'drop-shadow(0 3px 10px rgba(37,99,235,0.45))'
                }}
              >
                <defs>
                  <linearGradient id="pwaPrismTop" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="pwaPrismLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                  <linearGradient id="pwaPrismRight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#1d4ed8" />
                  </linearGradient>
                  <linearGradient id="pwaCoreBeam" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="50%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#00f2fe" />
                  </linearGradient>
                </defs>
                <g transform="translate(6, 6)">
                  <polygon points="20,4 34,12 20,20 6,12" fill="url(#pwaPrismTop)" opacity="0.95" />
                  <polygon points="6,12 20,20 20,36 6,28" fill="url(#pwaPrismLeft)" />
                  <polygon points="20,20 34,12 34,28 20,36" fill="url(#pwaPrismRight)" />
                  <path d="M20,6 L20,34" stroke="url(#pwaCoreBeam)" strokeWidth="2.5" strokeLinecap="round" />
                  <circle cx="20" cy="20" r="3.2" fill="#ffffff" />
                  <circle cx="20" cy="20" r="1.8" fill="#00f2fe" />
                  <polyline points="6,12 20,20 34,12" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" />
                  <line x1="20" y1="20" x2="20" y2="36" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
                </g>
              </svg>
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.2 }}>
                Install DropLync App
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-3)', marginTop: 2, lineHeight: 1.3 }}>
                {isIOS ? (
                  <span>
                    Tap <strong style={{ color: 'var(--brand)' }}>Share [↑]</strong> & select <strong style={{ color: 'var(--brand)' }}>Add to Home Screen</strong>
                  </span>
                ) : (
                  'Instant 1-tap 10GB sends on your phone'
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {!isIOS && deferredPrompt && (
              <button
                onClick={handleInstallClick}
                className="btn-primary"
                style={{ padding: '7px 14px', fontSize: '0.8rem', fontWeight: 800 }}
              >
                Install
              </button>
            )}
            <button
              onClick={handleDismiss}
              title="Dismiss"
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-3)',
                cursor: 'pointer',
                padding: 6,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  )
}
