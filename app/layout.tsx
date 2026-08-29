import type { Metadata, Viewport } from 'next'
import './globals.css'
import SoundEffects from '@/components/SoundEffects'
import PWAInstallPrompt from '@/components/PWAInstallPrompt'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export const metadata: Metadata = {
  title: 'DropLync — Transfer Large Files Up to 10GB Free | WeTransfer Alternative',
  description: 'Send large videos, archives, and documents up to 10GB for free with zero sign-up required. End-to-end encrypted file transfers with auto-expiring links.',
  keywords: [
    'file transfer', 'send large files free', 'wetransfer alternative', 'send 10gb file',
    'secure file sharing', 'large video upload', 'send files online', 'droplync', 'fast file stream'
  ],
  authors: [{ name: 'DropLync' }],
  creator: 'DropLync',
  publisher: 'DropLync',
  metadataBase: new URL('https://droplync.in'),
  alternates: {
    canonical: 'https://droplync.in',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://droplync.in',
    title: 'DropLync — Fast, Encrypted 10GB File Transfers (Free)',
    description: 'Upload files up to 10GB for free with zero registration. Secure, chunk-streamed, auto-expiring download links.',
    siteName: 'DropLync',
    images: [
      {
        url: 'https://droplync.in/icon-512.png',
        width: 512,
        height: 512,
        alt: 'DropLync 3D Quantum Prism Crystal Logo',
      }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'DropLync — Transfer Files Up to 10GB Free',
    description: 'Instant, fast, and encrypted large file transfers. No registration required.',
    images: ['https://droplync.in/icon-512.png'],
  },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'DropLync',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#060912' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID

  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="DropLync" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Google AdSense Script Integration */}
        {adsenseClientId && (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
          />
        )}

        {/* JSON-LD Structured Data Schema for Google Search */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: 'DropLync',
              url: 'https://droplync.in',
              applicationCategory: 'UtilitiesApplication',
              operatingSystem: 'All',
              offers: {
                '@type': 'Offer',
                price: '0.00',
                priceCurrency: 'USD'
              },
              description: 'Fast, secure and encrypted large file transfers up to 10GB for free without sign up.'
            })
          }}
        />
        {/* Service Worker Registration */}
        <script dangerouslySetInnerHTML={{ __html: `
          if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js');
            });
          }
        `}} />
        {/* Prevent dark mode flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          try {
            const t = localStorage.getItem('theme');
            if (t === 'dark' || (!t && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
              document.documentElement.classList.add('dark');
            }
          } catch(e) {}
        `}} />
      </head>
      <body>
        <SoundEffects />
        <PWAInstallPrompt />
        <div className="page-bg">
          {children}
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
