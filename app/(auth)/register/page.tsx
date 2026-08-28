'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Tilt3D from '@/components/ui/Tilt3D'
import Background3D from '@/components/Background3D'
import {
  ShieldLockIcon,
  CheckCircleIcon,
  ServerStackIcon,
  UploadCloudIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  AlertTriangleIcon,
  SpinnerIcon
} from '@/components/ui/Icons'

export default function RegisterPage() {
  const router = useRouter()
  const [step, setStep] = useState<'details' | 'otp'>('details')
  const [name, setName] = useState('')
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

  // Check if user is already logged in
  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data?.user) {
          window.location.href = '/dashboard'
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    let timer: any
    if (step === 'otp' && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000)
    } else if (countdown === 0) {
      setCanResend(true)
    }
    return () => clearInterval(timer)
  }, [step, countdown])

  useEffect(() => {
    if (step === 'otp' && otpInputsRef.current[0]) {
      setTimeout(() => otpInputsRef.current[0]?.focus(), 150)
    }
  }, [step])

  // Handle Send Register OTP
  async function handleSendRegisterOtp(e?: React.FormEvent) {
    if (e) e.preventDefault()
    setError('')
    setSuccessMsg('')
    const cleanEmail = email.toLowerCase().trim()
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, type: 'register' })
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
      setSuccessMsg(`We sent a 6-digit verification code to ${cleanEmail}`)
    } catch (err: any) {
      setLoading(false)
      setError('Failed to send verification code. Please check your network and try again.')
    }
  }

  // Handle Verify Register OTP & Create Account
  async function handleVerifyRegisterOtp(codeToVerify?: string) {
    setError('')
    const cleanEmail = email.toLowerCase().trim()
    const code = (codeToVerify || otpDigits.join('')).trim()
    if (code.length !== 6) {
      setError('Please enter all 6 digits of your verification code')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, code, name: name.trim(), password })
      })
      const data = await res.json()

      if (data.error) {
        setLoading(false)
        setError(data.error)
        return
      }

      setSuccessMsg('Account verified! Redirecting to dashboard...')
      window.location.href = '/dashboard'
    } catch (err: any) {
      setLoading(false)
      setError('Registration verification failed. Please try again.')
    }
  }

  function handleDigitChange(index: number, value: string) {
    if (value.length > 1) {
      const cleanDigits = value.replace(/\D/g, '').slice(0, 6).split('')
      const newDigits = [...otpDigits]
      cleanDigits.forEach((d, i) => {
        if (i < 6) newDigits[i] = d
      })
      setOtpDigits(newDigits)
      if (cleanDigits.length === 6) {
        handleVerifyRegisterOtp(cleanDigits.join(''))
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

    if (digit && index === 5 && newDigits.every(d => d !== '')) {
      handleVerifyRegisterOtp(newDigits.join(''))
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputsRef.current[index - 1]?.focus()
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputsRef.current[index + 1]?.focus()
    } else if (e.key === 'Enter') {
      handleVerifyRegisterOtp()
    }
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

      <section className="hero-bg" style={{ width: '100%', padding: '20px 0 28px', position: 'relative', zIndex: 1 }}>
        <div className="section-container">
          <div className="responsive-grid-hero">

            {/* Left: Copy & Value Props */}
            <div>
              <div style={{ marginBottom: 10 }}>
                <span className="stat-pill" style={{ padding: '4px 12px', fontSize: '0.78rem', borderColor: 'rgba(5,150,105,0.3)', background: 'rgba(5,150,105,0.08)' }}>
                  <span className="pulse-dot" style={{ background: '#059669', width: 6, height: 6 }} />
                  <span style={{ fontWeight: 800, color: '#059669', letterSpacing: '0.02em' }}>
                    Free Starter Tier · Instant Access
                  </span>
                </span>
              </div>

              <h1 style={{ fontSize: 'clamp(2.05rem, 3.2vw, 2.85rem)', fontWeight: 900, lineHeight: 1.12, marginBottom: 10, letterSpacing: '-0.04em', color: 'var(--text-1)' }}>
                Start transferring.<br />
                <span className="gradient-text">10GB Free with zero friction.</span>
              </h1>

              <p style={{ fontSize: '0.94rem', color: 'var(--text-2)', maxWidth: 460, lineHeight: 1.56, marginBottom: 16 }}>
                Create your free account to unlock multi-device transfer history, custom link expiration timers, encrypted password protection, and high-speed delivery.
              </p>

              {/* Feature Value Cards */}
              <div className="responsive-grid-2" style={{ marginBottom: 16, maxWidth: 430 }}>
                {[
                  { title: '10GB per Transfer Free', icon: <UploadCloudIcon size={16} color="var(--brand)" /> },
                  { title: 'Encrypted Link Vaults', icon: <ShieldLockIcon size={16} color="var(--brand)" /> },
                  { title: 'Direct Offset Streaming', icon: <ServerStackIcon size={16} color="var(--brand)" /> },
                  { title: 'Custom Auto-Purge Times', icon: <CheckCircleIcon size={16} color="#059669" /> }
                ].map((item, i) => (
                  <div key={i} className="card-soft card-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>{item.title}</span>
                  </div>
                ))}
              </div>

              {/* Social proof avatar stack */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex' }}>
                  {['#2563eb','#0284c7','#06b6d4','#059669','#3b82f6'].map((c, i) => (
                    <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid var(--bg)', marginLeft: i > 0 ? -9 : 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} />
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-1)', fontWeight: 800 }}>Over 50,000+ files transferred</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>No credit card required for 10GB Starter</div>
                </div>
              </div>
            </div>

            {/* Right: 3D Interactive Tilt Glass Register Form */}
            <div>
              <Tilt3D intensity={6} glare={true} className="glass-panel" style={{ padding: '24px 28px', borderRadius: 24, width: '100%' }}>
                
                {/* Step 1: Account Information */}
                {step === 'details' && (
                  <div>
                    <div style={{ marginBottom: 16, textAlign: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, margin: '0 auto 8px', background: 'rgba(5,150,105,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(5,150,105,0.25)' }}>
                        <UploadCloudIcon size={20} color="#059669" />
                      </div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: 2 }}>
                        Create Free Account
                      </h2>
                      <p style={{ color: 'var(--text-3)', fontSize: '0.8rem' }}>
                        10GB Free transfers · Email OTP verification required
                      </p>
                    </div>

                    <form onSubmit={handleSendRegisterOtp} style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                      <div>
                        <label className="label" style={{ fontSize: '0.76rem', marginBottom: 3 }}>Full name (optional)</label>
                        <input
                          className="input"
                          type="text"
                          placeholder="Your name"
                          value={name}
                          onChange={e => setName(e.target.value)}
                        />
                      </div>

                      <div>
                        <label className="label" style={{ fontSize: '0.76rem', marginBottom: 3 }}>Email or Gmail address</label>
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

                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                          <label className="label" style={{ fontSize: '0.76rem', margin: 0 }}>Password (optional)</label>
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: '0.72rem', cursor: 'pointer', fontWeight: 700 }}
                          >
                            {showPassword ? 'Hide' : 'Show'}
                          </button>
                        </div>
                        <input
                          className="input"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Set password (optional)"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                        />
                      </div>

                      {error && (
                        <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.1)', color: '#dc2626', fontSize: '0.78rem', border: '1px solid rgba(220,38,38,0.25)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertTriangleIcon size={14} color="#dc2626" />
                          <span>{error}</span>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary"
                        style={{ width: '100%', padding: '12px', marginTop: 4, fontSize: '0.94rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
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

                      <p style={{ fontSize: '0.7rem', color: 'var(--text-3)', textAlign: 'center', margin: '4px 0 0', lineHeight: 1.4 }}>
                        We will send a 6-digit OTP to your email to verify ownership.<br />
                        By registering, you agree to our{' '}
                        <a href="/terms" style={{ color: 'var(--brand)', textDecoration: 'underline' }}>Terms</a> and{' '}
                        <a href="/privacy" style={{ color: 'var(--brand)', textDecoration: 'underline' }}>Privacy Policy</a>.
                      </p>
                    </form>
                  </div>
                )}

                {/* Step 2: OTP Email Verification */}
                {step === 'otp' && (
                  <div>
                    <div style={{ marginBottom: 14, textAlign: 'center' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, margin: '0 auto 8px', background: 'rgba(5,150,105,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(5,150,105,0.25)' }}>
                        <CheckCircleIcon size={20} color="#059669" />
                      </div>
                      <h2 style={{ fontSize: '1.24rem', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em', marginBottom: 2 }}>
                        Verify Your Email
                      </h2>
                      <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', lineHeight: 1.4 }}>
                        Enter the 6-digit code sent to <strong style={{ color: 'var(--text-1)' }}>{email}</strong> ·{' '}
                        <button
                          type="button"
                          onClick={() => { setStep('details'); setError(''); }}
                          style={{ background: 'none', border: 'none', color: 'var(--brand)', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline', padding: 0 }}
                        >
                          Change
                        </button>
                      </p>
                    </div>

                    {successMsg && (
                      <div style={{ padding: '7px 12px', borderRadius: 8, background: 'rgba(5,150,105,0.1)', color: '#059669', fontSize: '0.76rem', border: '1px solid rgba(5,150,105,0.25)', fontWeight: 600, textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}>
                        <CheckCircleIcon size={14} color="#059669" />
                        <span>{successMsg}</span>
                      </div>
                    )}

                    {/* 6-Digit Boxes */}
                    <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginBottom: 14 }}>
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
                            width: 42,
                            height: 50,
                            textAlign: 'center',
                            fontSize: '1.35rem',
                            fontWeight: 800,
                            borderRadius: 12,
                            border: `2px solid ${digit ? '#059669' : 'var(--border)'}`,
                            background: digit ? 'var(--glass-bg)' : 'var(--glass-bg-subtle)',
                            color: 'var(--text-1)',
                            outline: 'none',
                            transition: 'all 150ms ease'
                          }}
                        />
                      ))}
                    </div>

                    {error && (
                      <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(220,38,38,0.1)', color: '#dc2626', fontSize: '0.78rem', border: '1px solid rgba(220,38,38,0.25)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                        <AlertTriangleIcon size={14} color="#dc2626" />
                        <span>{error}</span>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleVerifyRegisterOtp()}
                      disabled={loading || otpDigits.some(d => d === '')}
                      className="btn-primary"
                      style={{ width: '100%', padding: '11px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 12 }}
                    >
                      {loading ? (
                        <>
                          <SpinnerIcon size={18} />
                          <span>Completing Registration...</span>
                        </>
                      ) : (
                        <>
                          <span>Verify OTP & Create Account</span>
                          <ArrowRightIcon size={16} />
                        </>
                      )}
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.76rem' }}>
                      <button
                        type="button"
                        onClick={() => { setStep('details'); setError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4 }}
                      >
                        <ArrowLeftIcon size={14} />
                        <span>Back to details</span>
                      </button>

                      {canResend ? (
                        <button
                          type="button"
                          onClick={() => handleSendRegisterOtp()}
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

                {/* Footer Link to Login */}
                <div style={{ margin: '12px 0 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>Already registered?</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
                </div>

                <div style={{ textAlign: 'center' }}>
                  <Link
                    href="/login"
                    className="btn-secondary"
                    style={{ width: '100%', padding: '8px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textDecoration: 'none' }}
                  >
                    <span>Sign In to Existing Account</span>
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
