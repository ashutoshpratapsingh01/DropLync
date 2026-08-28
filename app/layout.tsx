import type { Metadata } from 'next'
import './globals.css'
import SoundEffects from '@/components/SoundEffects'

export const metadata: Metadata = {
  title: 'DropLync — Send it. Share it. Gone when it\'s done.',
  description: 'Secure file transfer and sharing. Upload files, get a secure link, share it. Files expire automatically.',
  icons: { icon: '/favicon.svg' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
        <div className="page-bg">
          {children}
        </div>
      </body>
    </html>
  )
}
