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
                borderRadius: 12,
                background: 'linear-gradient(135deg, var(--brand), #0284c7)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 4px 12px rgba(37,99,235,0.35)'
              }}
            >
              <DownloadCloudIcon size={20} color="white" />
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
