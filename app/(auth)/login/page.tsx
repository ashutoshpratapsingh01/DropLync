'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Tilt3D from '@/components/ui/Tilt3D'
import Background3D from '@/components/Background3D'
import {
  ShieldLockIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  ServerStackIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  AlertTriangleIcon,
  SpinnerIcon,
  ZapIcon
} from '@/components/ui/Icons'

export default function LoginPage() {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<'otp' | 'password'>('otp')
  const [step, setStep] = useState<'email' | 'otp'>('email')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', ''])
  const [countdown, setCountdown] = useState(60)
  const [canResend, setCanResend] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([])

  // Countdown timer for OTP resend
  useEffect(() => {
    let timer: any
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000)
    } else if (countdown === 0) {
      setCanResend(true)
    }
    return () => clearInterval(timer)
  }, [step, countdown])

  // Auto-focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === 'otp' && otpInputsRef.current[0]) {
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150)
    }
  }, [step])

  // Handle Send OTP
  async function handleSendOtp(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError('')
    setSuccessMsg('')
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'login' })
      })
      const data = await res.json()
      setLoading(false)

      if (data.error) {
        setError(data.error)
        return
      }

      setStep('otp')
      setCountdown(60)
      setCanResend(false)
      setOtpDigits(['', '', '', '', '', ''])
      setSuccessMsg(`We sent a 6-digit verification code to ${email}`)
    } catch (err: any) {
      setLoading(false)
      setError('Failed to send verification code. Please check your network and try again.')
    }
  }

  // Handle Verify OTP
  async function handleVerifyOtp(codeToVerify?: string) {
    setError('')
    const code = codeToVerify || otpDigits.join('')
    if (code.length !== 6) {
      setError('Please enter all 6 digits of your verification code')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })
      const data = await res.json()
      setLoading(false)

      if (data.error) {
        setError(data.error)
        return
      }

      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setLoading(false)
      setError('Verification failed. Please try again.')
    }
  }

  // Handle OTP digit input
  function handleDigitChange(index: number, value: string) {
    if (value.length > 1) {
      const cleanDigits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newDigits = [...otpDigits]
      cleanDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d
      })
      setOtpDigits(newDigits)
      if (cleanDigits.length === 6) {
        handleVerifyOtp(cleanDigits.join(''))
      } else {
        const nextIdx = Math.min(cleanDigits.length, 5)
        otpInputsRef.current[nextIdx]?.focus()
      }
      return
    }

    const digit = value.replace(/\D/g, '')
    const newDigits = [...otpDigits]
    newDigits[index] = digit
    setOtpDigits(newDigits)

    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    }

    // Auto submit on 6th digit
    if (digit && index === 5 && newDigits.every(d => d !== '')) {
      handleVerifyOtp(newDigits.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    }
  }

  // Handle Password Login
  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    setLoading(false)
    if (data.error) {
      setError(data.error)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <main style={{ position: 'relative', overflow: 'hidden', flex: 1, display: 'flex', alignItems: 'center' }}>
      {/* Background */}
      <Background3D />

      {/* Glowing Mesh Orbs */}
      <div className="ambient-orb-container">
        <div className="orb orb-primary" />
        <div className="orb orb-accent" />
        <div className="orb orb-indigo" />
      </div>

      <section className="hero-bg" style={{ width: '100%', padding: '24px 0 32px', position: 'relative', zIndex: 1 }}>
        <div className="section-container">
          <div className="responsive-grid-hero">

            {/* Left: Copy & Value Props */}
            <div>
              <div style={{ marginBottom: 12 }}>
                <span className="stat-pill" style={{ padding: '5px 14px', fontSize: '0.82rem', borderColor: 'rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.08)' }}>
                  <span className="pulse-dot" style={{ width: 7, height: 7 }} />
                  <span style={{ fontWeight: 800, color: 'var(--brand)', letterSpacing: '0.02em' }}>
                    10GB Free Storage · Secure OTP Sign In
                  </span>
                </span>
              </div>

              <h1 style={{ fontSize: 'clamp(2.15rem, 3.4vw, 3rem)', fontWeight: 900, lineHeight: 1.12, marginBottom: 12, letterSpacing: '-0.04em', color: 'var(--text-1)' }}>
                Welcome back.<br />
                <span className="gradient-text">Manage your files & streams.</span>
              </h1>

              <p style={{ fontSize: '0.98rem', color: 'var(--text-2)', maxWidth: 470, lineHeight: 1.6, marginBottom: 18 }}>
                Sign in with your email address to manage active transfer links, track recipient download analytics, and access upgraded <strong>50GB to 200GB+ storage vaults</strong>.
              </p>

              {/* Feature Value Cards */}
              <div className="responsive-grid-2" style={{ marginBottom: 18, maxWidth: 450 }}>
                {[
                  { title: '10GB Free Transfers', icon: <ArrowUpTrayIcon size={17} color="var(--brand)" /> },
                  { title: 'Encrypted Link Vaults', icon: <ShieldLockIcon size={17} color="var(--brand)" /> },
                  { title: 'Live Download Tracking', icon: <ServerStackIcon size={17} color="var(--brand)" /> },
                  { title: 'Auto-Purging Storage', icon: <CheckCircleIcon size={17} color="#059669" /> }
                ].map((item, i) => (
                  <div key={i} className="card-soft card-hover" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-1)' }}>{item.title}</span>
                  </div>
                ))}
              </div>

              {/* Social proof avatar stack */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex' }}>
                  {['#2563eb','#0284c7','#06b6d4','#059669','#3b82f6'].map((c, i) => (
                    <div key={i} style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: '2px solid var(--bg)', marginLeft: i > 0 ? -10 : 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} />
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '0.86rem', color: 'var(--text-1)', fontWeight: 800 }}>Over 50,000+ files transferred</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-3)' }}>Zero storage clutter · Auto-purging links</div>
                </div>
              </div>
            </div>

            {/* Right: 3D Interactive Tilt Glass Form */}
            <div>
              <Tilt3D intensity={6} glare={true} className="glass-panel" style={{ padding: '26px 30px', borderRadius: 24, width: '100%' }}>
                
                {/* OTP Flow: Step 1 (Enter Email) */}
                {authMode === 'otp' && step === 'email' && (
                  <div>
                    <div style={{ marginBottom: 18, textAlign: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 10px', background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(37,99,235,0.25)' }}>
                        <ShieldLockIcon size={22} color="var(--brand)" />
                      </div>
                      <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: 3 }}>
                        Sign In to DropLync
                      </h2>
                      <p style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>
                        Enter your email to receive a 6-digit verification code
                      </p>
                    </div>

                    <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label className="label" style={{ fontSize: '0.8rem', marginBottom: 5 }}>Email or Gmail address</label>
                        <input
                          className="input"
                          type="email"
                          placeholder="name@gmail.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                          autoFocus
                        />
                      </div>

                      {error && (
                        <div style={{ padding: '9px 14px', borderRadius: 8, background: 'rgba(220,38,38,0.1)', color: '#dc2626', fontSize: '0.82rem', border: '1px solid rgba(220,38,38,0.25)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <AlertTriangleIcon size={16} color="#dc2626" />
                          <span>{error}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{ width: '100%', padding: '12px', marginTop: 4, fontSize: '0.96rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      >
                        {loading ? (
                          <>
                            <SpinnerIcon size={18} />
                            <span>Sending Code to Email...</span>
                          </>
                        ) : (
                          <>
                            <span>Send 6-Digit Code to Email</span>
                            <ArrowRightIcon size={16} />
                          </>
                        )}
                      </button>

                      <div style={{ textAlign: 'center', marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => { setAuthMode('password'); setError(''); }}
                          style={{ background: 'none', border: 'none', color: 'var(--text-3)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          Or sign in with password instead
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* OTP Flow: Step 2 (Enter 6-Digit Code) */}
                {authMode === 'otp' && step === 'otp' && (
                  <div>
                    <div style={{ marginBottom: 16, textAlign: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 10px', background: 'rgba(5,150,105,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(5,150,105,0.25)' }}>
                        <CheckCircleIcon size={22} color="#059669" />
                      </div>
                      <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: 3 }}>
                        Enter 6-Digit Code
                      </h2>
                      <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', lineHeight: 1.4 }}>
                        Code sent to <strong style={{ color: 'var(--text-1)' }}>{email}</strong> ·{' '}
                        <button
                          type="button"
                          onClick={() => { setStep('email'); setError(''); }}
                          style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', padding: 0 }}
                        >
                          Change
                        </button>
                      </p>
                    </div>

                    {successMsg && (
                      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(5,150,105,0.1)', color: '#059669', fontSize: '0.78rem', border: '1px solid rgba(5,150,105,0.25)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 14 }}>
                        <CheckCircleIcon size={16} color="#059669" />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    {/* 6-Digit Interactive Input Boxes */}
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
                      {otpDigits.map((digit, idx) => (
                        <input
                          key={idx}
                          ref={el => { otpInputsRef.current[idx] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={digit}
                          onChange={e => handleDigitChange(idx, e.target.value)}
                          onKeyDown={e => handleKeyDown(idx, e)}
                          style={{
                            width: 44,
                            height: 52,
                            textAlign: 'center',
                            fontSize: '1.4rem',
                            fontWeight: 800,
                            borderRadius: 12,
                            border: `2px solid ${digit ? 'var(--brand)' : 'var(--border)'}`,
                            background: digit ? 'var(--glass-bg)' : 'var(--glass-bg-subtle)',
                            color: 'var(--text-1)',
                            outline: 'none',
                            transition: 'all 150ms ease'
                          }}
                        />
                      ))}
                    </div>

                    {error && (
                      <div style={{ padding: '9px 14px', borderRadius: 8, background: 'rgba(220,38,38,0.1)', color: '#dc2626', fontSize: '0.82rem', border: '1px solid rgba(220,38,38,0.25)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                        <AlertTriangleIcon size={16} color="#dc2626" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleVerifyOtp()}
                      disabled={loading || otpDigits.some(d => d === '')}
                      className="btn-primary"
                      style={{ width: '100%', padding: '12px', fontSize: '0.96rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 14 }}
                    >
                      {loading ? (
                        <>
                          <SpinnerIcon size={18} />
                          <span>Verifying Code...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify & Sign In</span>
                          <ArrowRightIcon size={16} />
                        </>
                      )}
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem' }}>
                      <button
                        type="button"
                        onClick={() => { setStep('email'); setError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <ArrowLeftIcon size={14} />
                        <span>Back to email</span>
                      </button>

                      {canResend ? (
                        <button
                          type="button"
                          onClick={() => handleSendOtp()}
                          style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontWeight: 700 }}
                        >
                          Resend Code
                        </button>
                      ) : (
                        <span style={{ color: 'var(--text-3)' }}>Resend in {countdown}s</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Password Flow */}
                {authMode === 'password' && (
                  <div>
                    <div style={{ marginBottom: 18, textAlign: 'center' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, margin: '0 auto 10px', background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(37,99,235,0.25)' }}>
                        <ShieldLockIcon size={22} color="var(--brand)" />
                      </div>
                      <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: 3 }}>
                        Sign In with Password
                      </h2>
                      <p style={{ color: 'var(--text-3)', fontSize: '0.84rem' }}>
                        Access your account using your password
                      </p>
                    </div>

                    <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div>
                        <label className="label" style={{ fontSize: '0.8rem', marginBottom: 4 }}>Email address</label>
                        <input
                          className="input"
                          type="email"
                          placeholder="name@example.com"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                          <label className="label" style={{ fontSize: '0.8rem', margin: 0 }}>Password</label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: '0.76rem', cursor: 'pointer', fontWeight: 700 }}
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <input
                          className="input"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="••••••••"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                        />
                      </div>

                      {error && (
                        <div style={{ padding: '9px 14px', borderRadius: 8, background: 'rgba(220,38,38,0.1)', color: '#dc2626', fontSize: '0.82rem', border: '1px solid rgba(220,38,38,0.25)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                          <AlertTriangleIcon size={16} color="#dc2626" />
                          <span>{error}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{ width: '100%', padding: '12px', marginTop: 2, fontSize: '0.96rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                      >
                        {loading ? (
                          <>
                            <SpinnerIcon size={18} />
                            <span>Authenticating...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In</span>
                            <ArrowRightIcon size={16} />
                          </>
                        )}
                      </button>

                      <div style={{ textAlign: 'center', marginTop: 4 }}>
                        <button
                          type="button"
                          onClick={() => { setAuthMode('otp'); setError(''); }}
                          style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        >
                          <ZapIcon size={14} color="var(--brand)" />
                          <span>Switch to Email OTP Sign In</span>
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Footer Divider & Register Switch */}
                <div style={{ margin: '14px 0 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>New to DropLync?</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Link
                    href="/register"
                    className="btn-secondary"
                    style={{ width: '100%', padding: '10px', fontSize: '0.86rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
                  >
                    <span>Create Free 10GB Account with Email OTP</span>
                    <ArrowRightIcon size={14} />
                  </Link>
                </div>

              </Tilt3D>
            </div>

          </div>
        </div>
      </section>
    </main>
  )
}
