'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  ZapIcon,
  XIcon,
  SunIcon,
  MoonIcon,
  UploadCloudIcon,
  SparklesIcon,
  DiamondIcon,
  LayoutDashboardIcon,
  SettingsIcon,
  LogOutIcon,
  ShieldLockIcon,
  UserIcon
} from '@/components/ui/Icons'
import Logo from '@/components/Logo'

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
    setMounted(true)
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
      className="card-hover"
      style={{
        width: 36,
        height: 36,
        borderRadius: '50%',
        background: 'var(--glass-bg)',
        border: '1.5px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: 'var(--text-1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        transition: 'all 200ms ease'
      }}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle theme"
    >
      {mounted && (
        dark ? (
          <MoonIcon size={16} color="#60a5fa" />
        ) : (
          <SunIcon size={17} color="#d97706" />
        )
      )}
    </button>
  )
}

interface NavbarProps {
  user?: { name?: string | null; email: string; role?: string; plan?: string } | null
}

export default function Navbar({ user }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 15)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    setMobileMenuOpen(false)
    router.push('/')
    router.refresh()
  }

  const displayName = user?.name || user?.email?.split('@')[0] || ''
  const userPlan = (user as any)?.plan || 'free'
  const isPro = userPlan === 'pro' || userPlan === 'ultra' || userPlan === 'enterprise'

  return (
    <nav
      className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: scrolled ? 'var(--glass-bg)' : 'rgba(var(--bg-rgb, 15,23,42), 0.75)',
        borderBottom: '1px solid var(--border)',
        transition: 'all 250ms cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      <div className="section-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, gap: 16 }}>

        {/* Brand Logo with 3D Quantum Prism */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none', flexShrink: 0 }} aria-label="DropLync Home">
          <Logo height={32} />
        </Link>

        {/* Center Icon-First Navigation Capsule (Desktop) */}
        <div
          className="mobile-hide"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 6px',
            borderRadius: 30,
            background: 'var(--glass-bg-subtle)',
            border: '1px solid var(--border-glass)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.04)'
          }}
        >
          {/* Transfer (Home) */}
          <Link
            href="/"
            title="Send files (10GB Free)"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.84rem',
              fontWeight: 800,
              textDecoration: 'none',
              transition: 'all 180ms ease',
              background: pathname === '/' ? 'rgba(37,99,235,0.12)' : 'transparent',
              color: pathname === '/' ? 'var(--brand)' : 'var(--text-2)',
              border: pathname === '/' ? '1px solid rgba(37,99,235,0.25)' : '1px solid transparent'
            }}
          >
            <UploadCloudIcon size={16} color={pathname === '/' ? 'var(--brand)' : 'currentColor'} />
            <span>Transfer</span>
          </Link>

          {/* Pricing */}
          <Link
            href="/pricing"
            title="Storage plans & tiers"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.84rem',
              fontWeight: 800,
              textDecoration: 'none',
              transition: 'all 180ms ease',
              background: pathname === '/pricing' ? 'rgba(37,99,235,0.12)' : 'transparent',
              color: pathname === '/pricing' ? 'var(--brand)' : 'var(--text-2)',
              border: pathname === '/pricing' ? '1px solid rgba(37,99,235,0.25)' : '1px solid transparent'
            }}
          >
            <DiamondIcon size={15} color={pathname === '/pricing' ? 'var(--brand)' : 'currentColor'} />
            <span>Pricing</span>
            <span
              style={{
                fontSize: '0.62rem',
                fontWeight: 900,
                padding: '2px 6px',
                borderRadius: 999,
                background: 'rgba(37,99,235,0.15)',
                color: 'var(--brand)',
                letterSpacing: '0.03em'
              }}
            >
              10GB FREE
            </span>
          </Link>

          {/* Features */}
          <Link
            href="/#features"
            title="Speed, encryption & architecture"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 14px',
              borderRadius: 20,
              fontSize: '0.84rem',
              fontWeight: 800,
              textDecoration: 'none',
              transition: 'all 180ms ease',
              color: 'var(--text-2)'
            }}
          >
            <SparklesIcon size={15} color="currentColor" />
            <span>Features</span>
          </Link>

          {/* Dashboard (if logged in) */}
          {user && (
            <Link
              href="/dashboard"
              title="Your file transfers & stats"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: '0.84rem',
                fontWeight: 800,
                textDecoration: 'none',
                transition: 'all 180ms ease',
                background: pathname === '/dashboard' ? 'rgba(37,99,235,0.12)' : 'transparent',
                color: pathname === '/dashboard' ? 'var(--brand)' : 'var(--text-2)',
                border: pathname === '/dashboard' ? '1px solid rgba(37,99,235,0.25)' : '1px solid transparent'
              }}
            >
              <LayoutDashboardIcon size={15} color={pathname === '/dashboard' ? 'var(--brand)' : 'currentColor'} />
              <span>Dashboard</span>
            </Link>
          )}
        </div>

        {/* Right Actions Dock (Desktop) */}
        <div className="mobile-hide" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggle />

          {user ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Upgrade Pill Button if Free */}
              {!isPro && (
                <Link
                  href="/pricing"
                  className="btn-primary"
                  style={{
                    padding: '6px 13px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    borderRadius: 20,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    boxShadow: '0 2px 10px rgba(37,99,235,0.3)'
                  }}
                >
                  <ZapIcon size={13} color="white" />
                  <span>Upgrade</span>
                </Link>
              )}

              {/* Admin Icon Button */}
              {user.role === 'admin' && (
                <Link
                  href="/admin"
                  title="Admin Telemetry Panel"
                  aria-label="Admin Telemetry Panel"
                  className="card-hover"
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'var(--glass-bg)',
                    border: '1.5px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-1)',
                    textDecoration: 'none'
                  }}
                >
                  <ShieldLockIcon size={16} color="var(--brand)" />
                </Link>
              )}

              {/* Settings Icon Button */}
              <Link
                href="/settings"
                title="Account Settings"
                aria-label="Account Settings"
                className="card-hover"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'var(--glass-bg)',
                  border: '1.5px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-1)',
                  textDecoration: 'none'
                }}
              >
                <SettingsIcon size={16} color="var(--text-2)" />
              </Link>

              {/* User Profile Capsule */}
              <Link
                href="/dashboard"
                title={`Logged in as ${displayName}`}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 12px 4px 6px',
                  background: 'var(--glass-bg-subtle)',
                  border: '1.5px solid var(--border-glass)',
                  borderRadius: 30,
                  textDecoration: 'none',
                  fontSize: '0.84rem',
                  fontWeight: 800,
                  color: 'var(--text-1)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
                }}
              >
                <span
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--brand), #0284c7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.76rem',
                    fontWeight: 900,
                    color: 'white',
                    boxShadow: '0 2px 6px rgba(37,99,235,0.4)',
                    position: 'relative'
                  }}
                >
                  {displayName.charAt(0).toUpperCase()}
                  <span
                    style={{
                      position: 'absolute',
                      bottom: -1,
                      right: -1,
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: '#059669',
                      border: '1.5px solid var(--bg)'
                    }}
                  />
                </span>
                <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {displayName}
                </span>
              </Link>

              {/* Sign Out Icon Button */}
              <button
                onClick={handleLogout}
                title="Sign Out"
                aria-label="Sign Out"
                className="card-hover"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: 'rgba(220,38,38,0.08)',
                  border: '1.5px solid rgba(220,38,38,0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#dc2626'
                }}
              >
                <LogOutIcon size={16} color="#dc2626" />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Sign In */}
              <Link
                href="/login"
                className="btn-secondary"
                style={{
                  padding: '7px 16px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  borderRadius: 20
                }}
              >
                Sign In
              </Link>

              {/* Get Started */}
              <Link
                href="/register"
                className="btn-primary"
                style={{
                  padding: '7px 18px',
                  fontSize: '0.82rem',
                  fontWeight: 800,
                  borderRadius: 20,
                  boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
                }}
              >
                Get Started Free
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger & Controls */}
        <div className="desktop-hide" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'var(--glass-bg)',
              border: '1.5px solid var(--border)',
              cursor: 'pointer',
              color: 'var(--text-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            aria-label="Toggle mobile navigation"
          >
            {mobileMenuOpen ? (
              <XIcon size={20} color="var(--text-1)" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Drawer */}
      {mobileMenuOpen && (
        <div
          style={{
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            borderBottom: '1px solid var(--border)',
            padding: '16px 18px 24px',
            boxShadow: '0 12px 32px rgba(0,0,0,0.15)'
          }}
          className="desktop-hide"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                color: 'var(--text-1)',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.92rem',
                background: pathname === '/' ? 'rgba(37,99,235,0.12)' : 'var(--glass-bg-subtle)',
                border: pathname === '/' ? '1px solid rgba(37,99,235,0.25)' : '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <UploadCloudIcon size={18} color="var(--brand)" />
              <span>Transfer Files (10GB Free)</span>
            </Link>

            <Link
              href="/pricing"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                color: 'var(--text-1)',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.92rem',
                background: pathname === '/pricing' ? 'rgba(37,99,235,0.12)' : 'var(--glass-bg-subtle)',
                border: pathname === '/pricing' ? '1px solid rgba(37,99,235,0.25)' : '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <DiamondIcon size={18} color="var(--brand)" />
                <span>Pricing & Storage Plans</span>
              </div>
              <span style={{ padding: '2px 7px', borderRadius: 999, background: 'rgba(37,99,235,0.15)', color: 'var(--brand)', fontSize: '0.72rem', fontWeight: 800 }}>10GB FREE</span>
            </Link>

            <Link
              href="/#features"
              onClick={() => setMobileMenuOpen(false)}
              style={{
                padding: '10px 14px',
                borderRadius: 12,
                color: 'var(--text-1)',
                textDecoration: 'none',
                fontWeight: 800,
                fontSize: '0.92rem',
                background: 'var(--glass-bg-subtle)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                gap: 10
              }}
            >
              <SparklesIcon size={18} color="var(--brand)" />
              <span>Features & Encryption</span>
            </Link>

            {user ? (
              <>
                <div className="divider" style={{ margin: '6px 0' }} />
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--glass-bg-subtle)',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    color: 'var(--text-1)',
                    fontWeight: 800
                  }}
                >
                  <LayoutDashboardIcon size={18} color="var(--brand)" />
                  <span>Dashboard ({displayName})</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: 'var(--glass-bg-subtle)',
                    border: '1px solid var(--border)',
                    textDecoration: 'none',
                    color: 'var(--text-1)',
                    fontWeight: 800
                  }}
                >
                  <SettingsIcon size={18} color="var(--brand)" />
                  <span>Settings & Security</span>
                </Link>

                {user.role === 'admin' && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '10px 14px',
                      borderRadius: 12,
                      background: 'var(--glass-bg-subtle)',
                      border: '1px solid var(--border)',
                      textDecoration: 'none',
                      color: 'var(--text-1)',
                      fontWeight: 800
                    }}
                  >
                    <ShieldLockIcon size={18} color="var(--brand)" />
                    <span>Admin Telemetry</span>
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  style={{
                    marginTop: 4,
                    padding: '11px 14px',
                    borderRadius: 12,
                    color: '#dc2626',
                    border: '1.5px solid rgba(220,38,38,0.25)',
                    background: 'rgba(220,38,38,0.08)',
                    cursor: 'pointer',
                    fontWeight: 800,
                    fontSize: '0.88rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8
                  }}
                >
                  <LogOutIcon size={16} color="#dc2626" />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <>
                <div className="divider" style={{ margin: '6px 0' }} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-secondary"
                    style={{ padding: '11px', textAlign: 'center', justifyContent: 'center', borderRadius: 12, fontSize: '0.86rem', fontWeight: 800 }}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary"
                    style={{ padding: '11px', textAlign: 'center', justifyContent: 'center', borderRadius: 12, fontSize: '0.86rem', fontWeight: 800 }}
                  >
                    Get Started
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}
