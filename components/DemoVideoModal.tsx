'use client'

import { useState, useEffect, useRef } from 'react'
import {
  PlayIcon,
  PauseIcon,
  RotateCcwIcon,
  XIcon,
  UploadCloudIcon,
  ShieldLockIcon,
  CheckCircleIcon,
  CopyIcon,
  SparklesIcon,
  ArrowRightIcon,
  FileIcon,
  CheckIcon
} from '@/components/ui/Icons'

interface DemoVideoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DemoVideoModal({ isOpen, onClose }: DemoVideoModalProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)
  const [progress, setProgress] = useState(0)
  const [uploadPercent, setUploadPercent] = useState(0)
  const [copiedLink, setCopiedLink] = useState(false)
  const animRef = useRef<NodeJS.Timeout | null>(null)

  // Demo playback loop (15 seconds total: 0-5s Step 1, 5-10s Step 2, 10-15s Step 3)
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(true)
      setCurrentStep(1)
      setProgress(0)
      setUploadPercent(0)
      setCopiedLink(false)
      if (animRef.current) clearInterval(animRef.current)
      return
    }

    if (!isPlaying) {
      if (animRef.current) clearInterval(animRef.current)
      return
    }

    const totalDuration = 14000 // 14 seconds
    const intervalMs = 50

    animRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + (intervalMs / totalDuration) * 100
        if (next >= 100) {
          // Loop back to start
          setCurrentStep(1)
          setUploadPercent(0)
          setCopiedLink(false)
          return 0
        }

        // Determine step based on timeline percentage
        if (next < 35) {
          setCurrentStep(1)
        } else if (next >= 35 && next < 70) {
          setCurrentStep(2)
          // Calculate upload percentage (0% to 100%) during step 2
          const step2Ratio = (next - 35) / 35
          setUploadPercent(Math.min(100, Math.round(step2Ratio * 100)))
        } else {
          setCurrentStep(3)
          if (next > 82) {
            setCopiedLink(true)
          }
        }

        return next
      })
    }, intervalMs)

    return () => {
      if (animRef.current) clearInterval(animRef.current)
    }
  }, [isOpen, isPlaying])

  if (!isOpen) return null

  function jumpToStep(stepNum: 1 | 2 | 3) {
    setCurrentStep(stepNum)
    if (stepNum === 1) {
      setProgress(0)
      setUploadPercent(0)
      setCopiedLink(false)
    } else if (stepNum === 2) {
      setProgress(36)
      setUploadPercent(15)
      setCopiedLink(false)
    } else {
      setProgress(71)
      setUploadPercent(100)
      setCopiedLink(false)
    }
  }

  function handleRestart() {
    setCurrentStep(1)
    setProgress(0)
    setUploadPercent(0)
    setCopiedLink(false)
    setIsPlaying(true)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(6, 9, 18, 0.82)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 200ms ease forwards'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 680,
          background: 'var(--glass-bg)',
          borderRadius: 24,
          border: '1.5px solid var(--border-glow)',
          boxShadow: 'var(--glass-shadow), 0 25px 60px rgba(0, 0, 0, 0.5)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'checkPop 300ms var(--ease-spring) forwards'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Window Header */}
        <div
          style={{
            padding: '12px 18px',
            background: 'var(--glass-bg-subtle)',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308' }} />
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
            </div>
            <span style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-1)' }}>
              How DropLync Works · 3-Step Video Demo
            </span>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-3)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 6
            }}
          >
            <XIcon size={18} />
          </button>
        </div>

        {/* Step Tabs Navigation */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            borderBottom: '1px solid var(--border)',
            background: 'var(--bg)'
          }}
        >
          {[
            { step: 1 as const, label: '1. Drop 10GB Files', desc: 'Drag & drop zero limits' },
            { step: 2 as const, label: '2. Direct Stream', desc: 'Chunked 256-bit encryption' },
            { step: 3 as const, label: '3. Share Link', desc: 'Instant private download' }
          ].map(item => {
            const active = currentStep === item.step
            return (
              <button
                key={item.step}
                onClick={() => jumpToStep(item.step)}
                style={{
                  padding: '10px 12px',
                  background: active ? 'rgba(37,99,235,0.08)' : 'transparent',
                  border: 'none',
                  borderBottom: active ? '2.5px solid var(--brand)' : '2.5px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms ease'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: active ? 'var(--brand)' : 'var(--text-2)' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', display: 'none', marginTop: 1 }}>
                  {item.desc}
                </div>
              </button>
            )
          })}
        </div>

        {/* Animated Video Simulation Stage */}
        <div
          style={{
            minHeight: 280,
            padding: '24px 20px',
            background: 'radial-gradient(ellipse at center, rgba(37,99,235,0.08) 0%, rgba(6,9,18,0.95) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* STEP 1: Dropping Files Simulation */}
          {currentStep === 1 && (
            <div
              className="reveal"
              style={{
                width: '100%',
                maxWidth: 420,
                textAlign: 'center',
                animation: 'fadeIn 300ms ease'
              }}
            >
              <div
                style={{
                  border: '2px dashed var(--brand)',
                  borderRadius: 20,
                  padding: '30px 20px',
                  background: 'rgba(37,99,235,0.06)',
                  boxShadow: '0 0 25px rgba(37,99,235,0.15)',
                  position: 'relative'
                }}
              >
                {/* Floating File Badge Animating into Box */}
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 14,
                    background: 'linear-gradient(135deg, var(--brand), #0284c7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 8px 20px rgba(37,99,235,0.4)',
                    animation: 'floatSlow 2s ease-in-out infinite'
                  }}
                >
                  <UploadCloudIcon size={26} color="white" />
                </div>

                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-1)', marginBottom: 4 }}>
                  Drop files here or click to browse
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: 12 }}>
                  Send up to <strong style={{ color: 'var(--brand)' }}>10GB Free</strong> per transfer · No sign-in required
                </p>

                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '6px 14px',
                    borderRadius: 999,
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--border)'
                  }}
                >
                  <FileIcon size={14} color="var(--brand)" />
                  <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-2)' }}>
                    Project_Archive_4.8GB.zip
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#059669', fontWeight: 800 }}>Ready</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Real-Time Stream & Chunk Encryption */}
          {currentStep === 2 && (
            <div
              className="reveal"
              style={{
                width: '100%',
                maxWidth: 420,
                textAlign: 'center',
                animation: 'fadeIn 300ms ease'
              }}
            >
              <div
                className="card"
                style={{
                  padding: '24px 20px',
                  borderRadius: 20,
                  border: '1.5px solid rgba(37,99,235,0.3)',
                  background: 'var(--glass-bg)',
                  boxShadow: '0 8px 30px rgba(37,99,235,0.18)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.92rem', fontWeight: 900, color: 'var(--text-1)' }}>
                      Streaming Chunks to Server...
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-3)', marginTop: 2 }}>
                      AES-256 GCM · Speed: <strong style={{ color: 'var(--brand)' }}>94.2 MB/s</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.15rem', fontWeight: 900 }} className="gradient-text">
                    {uploadPercent}%
                  </div>
                </div>

                {/* Progress Bar */}
                <div
                  style={{
                    height: 10,
                    borderRadius: 999,
                    background: 'rgba(203,213,225,0.2)',
                    overflow: 'hidden',
                    marginBottom: 16,
                    border: '1px solid var(--border)'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #2563eb, #0284c7, #06b6d4)',
                      width: `${uploadPercent}%`,
                      transition: 'width 100ms linear',
                      boxShadow: '0 0 12px rgba(37,99,235,0.6)'
                    }}
                  />
                </div>

                {/* Active stream blocks */}
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        background: (uploadPercent / 20) >= i ? 'var(--brand)' : 'rgba(255,255,255,0.1)',
                        transition: 'background 200ms ease'
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Share Link & Instant Download */}
          {currentStep === 3 && (
            <div
              className="reveal"
              style={{
                width: '100%',
                maxWidth: 420,
                textAlign: 'center',
                animation: 'fadeIn 300ms ease'
              }}
            >
              <div
                className="card"
                style={{
                  padding: '22px 20px',
                  borderRadius: 20,
                  border: '1.5px solid rgba(5,150,105,0.35)',
                  background: 'var(--glass-bg)',
                  boxShadow: '0 8px 30px rgba(5,150,105,0.15)'
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'rgba(5,150,105,0.15)',
                    border: '2px solid #059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                    boxShadow: '0 0 16px rgba(5,150,105,0.3)'
                  }}
                >
                  <CheckCircleIcon size={24} color="#059669" />
                </div>

                <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-1)', marginBottom: 2 }}>
                  Transfer Link Ready!
                </div>
                <p style={{ fontSize: '0.76rem', color: 'var(--text-3)', marginBottom: 12 }}>
                  Auto-expires in 7 days · 256-bit encrypted
                </p>

                {/* Link Box */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: 'var(--glass-bg-subtle)',
                    border: '1px solid var(--border)',
                    borderRadius: 12,
                    padding: '8px 12px',
                    marginBottom: 10
                  }}
                >
                  <input
                    type="text"
                    readOnly
                    value="https://droplync.vercel.app/f/quantum-4x9b"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--brand)',
                      fontSize: '0.78rem',
                      fontWeight: 800,
                      width: '100%',
                      outline: 'none'
                    }}
                  />
                  <button
                    className="btn-primary"
                    style={{
                      padding: '5px 12px',
                      fontSize: '0.74rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      flexShrink: 0
                    }}
                  >
                    {copiedLink ? (
                      <>
                        <CheckIcon size={12} />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={12} />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Video Scrubber & Playback Controls Bar */}
        <div
          style={{
            padding: '12px 18px',
            background: 'var(--glass-bg-subtle)',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}
        >
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              background: 'var(--brand)',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(37,99,235,0.4)'
            }}
          >
            {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          </button>

          <button
            onClick={handleRestart}
            title="Replay from start"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-3)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 4
            }}
          >
            <RotateCcwIcon size={16} />
          </button>

          {/* Timeline Bar */}
          <div
            style={{
              flex: 1,
              height: 6,
              borderRadius: 999,
              background: 'rgba(203,213,225,0.25)',
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const clickX = e.clientX - rect.left
              const newRatio = clickX / rect.width
              setProgress(newRatio * 100)
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, var(--brand), #00f2fe)',
                width: `${progress}%`,
                borderRadius: 999
              }}
            />
          </div>

          <div style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-3)', minWidth: 42, textAlign: 'right' }}>
            {Math.round((progress / 100) * 14)}s / 14s
          </div>
        </div>
      </div>
    </div>
  )
}
