import Navbar from '@/components/Navbar'
import { getSession } from '@/lib/auth'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <Navbar user={user} />
      <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center' }}>
        {children}
      </div>
      {/* ── Footer sits below the fold ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '14px 0', background: 'var(--glass-bg-subtle)', backdropFilter: 'blur(16px)', position: 'relative', zIndex: 1 }}>
        <div className="section-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <img src="/logo.svg" alt="DropLync" height={22} style={{ height: 22 }} />
            <div style={{ display: 'flex', gap: 18 }}>
              <a href="/pricing" style={{ fontSize: '0.78rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Pricing & Plans</a>
              <a href="/privacy" style={{ fontSize: '0.78rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
              <a href="/terms" style={{ fontSize: '0.78rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>
              <a href="/security" style={{ fontSize: '0.78rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Security</a>
            </div>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-3)' }}>© 2026 DropLync. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
