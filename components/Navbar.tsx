'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ZapIcon } from '@/components/ui/Icons'

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])
  function toggle() {
    const next = !dark
    setDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }
  return (
    <button
      onClick={toggle}
      className="theme-toggle"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      <div className="theme-toggle-thumb" />
    </button>
  )
}

interface NavbarProps {
  user?: { name?: string | null; email: string; role: string; plan?: string } | null
}

export default function Navbar({ user }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  const displayName = user?.name || user?.email?.split('@')[0] || ''
  const userPlan = (user as any)?.plan || 'free'

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="section-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

        {/* Brand Logo with 3D Quantum Prism Icon */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
          <img src="/logo.svg" alt="DropLync" height={32} style={{ height: 32, filter: 'drop-shadow(0 4px 12px rgba(37,99,235,0.3))' }} />
        </Link>

        {/* Center navigation links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/#features" className="btn-ghost">
            Features
          </Link>
          <Link href="/pricing" className="btn-ghost" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>Pricing & Plans</span>
            <span style={{ padding: '2px 7px', borderRadius: 999, background: 'rgba(37,99,235,0.12)', color: 'var(--brand)', fontSize: '0.72rem', fontWeight: 800 }}>10GB FREE</span>
          </Link>
        </div>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <ThemeToggle />
          {user ? (
            <>
              <Link href="/dashboard" className="btn-ghost">
                Dashboard
              </Link>
              {user.role === 'admin' && (
                <Link href="/admin" className="btn-ghost">
                  Admin
                </Link>
              )}
              <Link href="/settings" className="btn-ghost">
                Settings
              </Link>
              {userPlan === 'free' && (
                <Link href="/pricing" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <ZapIcon size={14} color="white" />
                  <span>Upgrade</span>
                </Link>
              )}

              <button onClick={handleLogout} className="btn-ghost">
                Sign out
              </button>
              <Link
                href="/dashboard"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '6px 16px 6px 8px',
                  background: 'var(--glass-bg-subtle)',
                  border: '1.5px solid var(--border-glass)',
                  borderRadius: 999,
                  textDecoration: 'none',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  color: 'var(--text-1)',
                  boxShadow: 'var(--shadow-xs)'
                }}
              >
                <span
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand), var(--brand-dark))',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.8rem',
                    fontWeight: 800,
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(37,99,235,0.4)'
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </span>
                {displayName}
              </Link>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">
                Sign In
              </Link>
              <Link href="/register" className="btn-primary" style={{ padding: '11px 22px', fontSize: '0.92rem' }}>
                Get Started Free
              </Link>

            </>
          )}
        </div>
      </div>
    </nav>
  )
}
