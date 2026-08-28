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
  FileIcon,
  CheckIcon,
  SparklesIcon
} from '@/components/ui/Icons'

interface DemoVideoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DemoVideoModal({ isOpen, onClose }: DemoVideoModalProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0) // 0 to 100
  const [copiedLink, setCopiedLink] = useState(false)
  const animRef = useRef<NodeJS.Timeout | null>(null)

  // 14 seconds total loop:
  // 0% - 32% (0s-4.5s): Phase 1 - Select & Drag-Drop File
  // 32% - 70% (4.5s-9.8s): Phase 2 - 256-bit Encrypted Stream Upload
  // 70% - 100% (9.8s-14s): Phase 3 - Instant Link Generated & 1-Click Copy
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(true)
      setProgress(0)
      setCopiedLink(false)
      if (animRef.current) clearInterval(animRef.current)
      return
    }

    if (!isPlaying) {
      if (animRef.current) clearInterval(animRef.current)
      return
    }

    const totalDuration = 14000 // 14s
    const intervalMs = 40

    animRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + (intervalMs / totalDuration) * 100
        if (next >= 100) {
          setCopiedLink(false)
          return 0
        }
        if (next >= 82) {
          setCopiedLink(true)
        } else {
          setCopiedLink(false)
        }
        return next
      })
    }, intervalMs)

    return () => {
      if (animRef.current) clearInterval(animRef.current)
    }
  }, [isOpen, isPlaying])

  if (!isOpen) return null

  // Calculate cursor positions & phases based on progress
  let cursorX = 50
  let cursorY = 50
  let cursorClicked = false
  let isDraggingFile = false
  let uploadPercent = 0
  let currentPhase: 1 | 2 | 3 = 1

  if (progress < 32) {
    currentPhase = 1
    // Phase 1: Move to file, drag into dropzone
    const p1 = progress / 32
    if (p1 < 0.3) {
      // Move cursor towards file
      cursorX = 20 + p1 * 30
      cursorY = 75 - p1 * 20
    } else if (p1 >= 0.3 && p1 < 0.75) {
      // Dragging file into center dropzone
      isDraggingFile = true
      cursorClicked = true
      const dragP = (p1 - 0.3) / 0.45
      cursorX = 29 + dragP * 21 // moves from 29% to 50%
      cursorY = 69 - dragP * 24 // moves from 69% to 45%
    } else {
      // Dropped into dropzone, clicking start upload
      cursorX = 50
      cursorY = 48
      cursorClicked = p1 > 0.88
    }
  } else if (progress >= 32 && progress < 70) {
    currentPhase = 2
    // Phase 2: Uploading stream
    const p2 = (progress - 32) / 38
    uploadPercent = Math.min(100, Math.round(p2 * 100))
    // Cursor hovers peacefully over telemetry
    cursorX = 65 + Math.sin(p2 * Math.PI) * 4
    cursorY = 55 + Math.cos(p2 * Math.PI) * 4
  } else {
    currentPhase = 3
    // Phase 3: Link generated, cursor moves to Copy Link button and clicks
    const p3 = (progress - 70) / 30
    if (p3 < 0.4) {
      cursorX = 50 + p3 * 50
      cursorY = 50 + p3 * 20
    } else {
      cursorX = 70
      cursorY = 58
      cursorClicked = p3 > 0.45
    }
  }

  function handleJump(targetProgress: number) {
    setProgress(targetProgress)
    setCopiedLink(targetProgress >= 82)
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(2, 4, 10, 0.88)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
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
          maxWidth: 780,
          background: '#070b16',
          borderRadius: 22,
          border: '1.5px solid var(--border-glow)',
          boxShadow: 'var(--glass-shadow), 0 30px 80px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'checkPop 300ms var(--ease-spring) forwards'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Browser Top Window Bar */}
        <div
          style={{
            padding: '10px 16px',
            background: '#0d1322',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#ef4444' }} />
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#eab308' }} />
              <div style={{ width: 11, height: 11, borderRadius: '50%', background: '#22c55e' }} />
            </div>

            {/* Simulated browser URL pill */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 8,
                padding: '3px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.72rem',
                color: '#94a3b8',
                fontFamily: 'monospace'
              }}
            >
              <span style={{ color: '#22c55e' }}>🔒</span>
              <span>https://droplync.vercel.app</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 800,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.12)',
                padding: '3px 8px',
                borderRadius: 6,
                border: '1px solid rgba(56, 189, 248, 0.25)'
              }}
            >
              1080p 60FPS
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-3)',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <XIcon size={18} />
            </button>
          </div>
        </div>

        {/* Phase Step Headers */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#090e1c'
          }}
        >
          {[
            { phase: 1 as const, time: '0s-4s', label: '1. Select 10GB Files', jump: 0 },
            { phase: 2 as const, time: '4s-9s', label: '2. 256-Bit Stream Upload', jump: 36 },
            { phase: 3 as const, time: '9s-14s', label: '3. Instant Link & 1-Click Copy', jump: 72 }
          ].map(item => {
            const active = currentPhase === item.phase
            return (
              <button
                key={item.phase}
                onClick={() => handleJump(item.jump)}
                style={{
                  padding: '9px 12px',
                  background: active ? 'rgba(37,99,235,0.12)' : 'transparent',
                  border: 'none',
                  borderBottom: active ? '2.5px solid #38bdf8' : '2.5px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms ease'
                }}
              >
                <div style={{ fontSize: '0.78rem', fontWeight: 800, color: active ? '#38bdf8' : '#94a3b8' }}>
                  {item.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* Video Canvas Stage (16:9 Screen Player) */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            maxHeight: 410,
            background: 'radial-gradient(ellipse at 50% 30%, #0f1c3f 0%, #050813 100%)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {/* Animated Background Mesh Orbs */}
          <div
            style={{
              position: 'absolute',
              width: 260,
              height: 260,
              borderRadius: '50%',
              background: '#2563eb',
              filter: 'blur(80px)',
              opacity: 0.25,
              top: '10%',
              left: '30%',
              pointerEvents: 'none'
            }}
          />

          {/* Screencast Watermark / Live Badge */}
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 16,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(10px)',
              padding: '4px 10px',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.12)'
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 8px #ef4444',
                animation: 'pulseDot 1.5s infinite'
              }}
            />
            <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
              SCREENTOUR · DEMO
            </span>
          </div>

          {/* ══════ PHASE 1: DRAG & DROP SELECTION ══════ */}
          {currentPhase === 1 && (
            <div
              style={{
                width: '88%',
                maxWidth: 480,
                textAlign: 'center',
                position: 'relative',
                animation: 'fadeIn 250ms ease'
              }}
            >
              <div
                style={{
                  border: isDraggingFile ? '2.5px dashed #38bdf8' : '2px dashed rgba(37,99,235,0.5)',
                  borderRadius: 20,
                  padding: '36px 20px',
                  background: isDraggingFile ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.75)',
                  boxShadow: isDraggingFile ? '0 0 35px rgba(56,189,248,0.3)' : '0 10px 30px rgba(0,0,0,0.4)',
                  transition: 'all 200ms ease'
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 8px 22px rgba(37,99,235,0.45)'
                  }}
                >
                  <UploadCloudIcon size={28} color="white" />
                </div>

                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f8fafc', marginBottom: 4 }}>
                  {isDraggingFile ? 'Release to Drop 10GB File' : 'Drop your files to start transfer'}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                  Send up to <strong style={{ color: '#38bdf8' }}>10GB Free</strong> · End-to-End Encrypted
                </div>
              </div>

              {/* Draggable File Floating Badge */}
              <div
                style={{
                  position: 'absolute',
                  left: isDraggingFile ? '50%' : '14%',
                  top: isDraggingFile ? '50%' : '80%',
                  transform: 'translate(-50%, -50%)',
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  border: '1.5px solid #38bdf8',
                  borderRadius: 12,
                  padding: '8px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: '0 12px 28px rgba(0,0,0,0.6)',
                  pointerEvents: 'none',
                  zIndex: 20,
                  transition: 'all 120ms linear'
                }}
              >
                <FileIcon size={18} color="#38bdf8" />
                <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#ffffff' }}>
                  Video_Production_Master_4.8GB.zip
                </span>
                <span style={{ fontSize: '0.7rem', color: '#22c55e', fontWeight: 800 }}>4.8 GB</span>
              </div>
            </div>
          )}

          {/* ══════ PHASE 2: STREAMING & ENCRYPTION ══════ */}
          {currentPhase === 2 && (
            <div
              style={{
                width: '88%',
                maxWidth: 480,
                textAlign: 'center',
                position: 'relative',
                animation: 'fadeIn 250ms ease'
              }}
            >
              <div
                style={{
                  padding: '28px 24px',
                  borderRadius: 22,
                  border: '1.5px solid rgba(56,189,248,0.4)',
                  background: 'rgba(15, 23, 42, 0.85)',
                  boxShadow: '0 12px 40px rgba(37,99,235,0.25)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '1.05rem', fontWeight: 900, color: '#f8fafc' }}>
                      Streaming Chunked Payload...
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                      AES-256 GCM · Line Speed: <strong style={{ color: '#38bdf8' }}>96.4 MB/s</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#38bdf8' }}>
                    {uploadPercent}%
                  </div>
                </div>

                {/* Animated Glowing Progress Bar */}
                <div
                  style={{
                    height: 12,
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                    marginBottom: 16,
                    border: '1px solid rgba(255,255,255,0.12)'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #2563eb, #0284c7, #00f2fe)',
                      width: `${uploadPercent}%`,
                      transition: 'width 80ms linear',
                      boxShadow: '0 0 16px rgba(0,242,254,0.7)'
                    }}
                  />
                </div>

                {/* Chunk offset telemetry boxes */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                    Offset: {(uploadPercent * 48).toFixed(0)}MB / 4800MB
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#22c55e', fontWeight: 700 }}>
                    Direct Stream Zero Stalls
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ══════ PHASE 3: INSTANT LINK & 1-CLICK COPY ══════ */}
          {currentPhase === 3 && (
            <div
              style={{
                width: '88%',
                maxWidth: 480,
                textAlign: 'center',
                position: 'relative',
                animation: 'fadeIn 250ms ease'
              }}
            >
              <div
                style={{
                  padding: '28px 24px',
                  borderRadius: 22,
                  border: '1.5px solid rgba(34,197,94,0.45)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  boxShadow: '0 12px 40px rgba(34,197,94,0.2)'
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'rgba(34,197,94,0.15)',
                    border: '2px solid #22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 10px',
                    boxShadow: '0 0 20px rgba(34,197,94,0.35)'
                  }}
                >
                  <CheckCircleIcon size={26} color="#22c55e" />
                </div>

                <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f8fafc', marginBottom: 3 }}>
                  Transfer Link Ready to Share!
                </div>
                <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginBottom: 14 }}>
                  Expires in 7 days · 10GB Payload Encrypted
                </div>

                {/* Instant Link Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    background: '#070b16',
                    border: copiedLink ? '1.5px solid #22c55e' : '1px solid rgba(255,255,255,0.15)',
                    borderRadius: 14,
                    padding: '8px 14px',
                    boxShadow: copiedLink ? '0 0 16px rgba(34,197,94,0.3)' : 'none',
                    transition: 'all 200ms ease'
                  }}
                >
                  <input
                    type="text"
                    readOnly
                    value="https://droplync.vercel.app/f/quantum-48g9"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: copiedLink ? '#22c55e' : '#38bdf8',
                      fontSize: '0.84rem',
                      fontWeight: 800,
                      width: '100%',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    className="btn-primary"
                    style={{
                      padding: '6px 14px',
                      fontSize: '0.76rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      flexShrink: 0,
                      background: copiedLink ? '#16a34a' : '#2563eb'
                    }}
                  >
                    {copiedLink ? (
                      <>
                        <CheckIcon size={13} color="white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={13} />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══════ REALISTIC ANIMATED OS MOUSE CURSOR ══════ */}
          <div
            style={{
              position: 'absolute',
              left: `${cursorX}%`,
              top: `${cursorY}%`,
              zIndex: 9999,
              pointerEvents: 'none',
              transform: cursorClicked ? 'scale(0.88)' : 'scale(1)',
              transition: 'left 80ms linear, top 80ms linear, transform 100ms ease',
              filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.7))'
            }}
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
              <polygon points="0 0 0 20 5.5 15.5 10 24 13 22.5 8.5 14 16 14" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
            </svg>
            {cursorClicked && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '2px solid rgba(56,189,248,0.8)',
                  animation: 'ping 400ms cubic-bezier(0, 0, 0.2, 1) infinite'
                }}
              />
            )}
          </div>
        </div>

        {/* Video Scrubber & Playback Controls Bar */}
        <div
          style={{
            padding: '12px 18px',
            background: '#0d1322',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 14
          }}
        >
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#2563eb',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 12px rgba(37,99,235,0.45)'
            }}
          >
            {isPlaying ? <PauseIcon size={16} /> : <PlayIcon size={16} />}
          </button>

          <button
            onClick={() => {
              setProgress(0)
              setIsPlaying(true)
            }}
            title="Replay video"
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: 4
            }}
          >
            <RotateCcwIcon size={17} />
          </button>

          {/* Interactive Timeline Bar */}
          <div
            style={{
              flex: 1,
              height: 7,
              borderRadius: 999,
              background: 'rgba(255, 255, 255, 0.15)',
              position: 'relative',
              cursor: 'pointer',
              overflow: 'hidden'
            }}
            onClick={e => {
              const rect = e.currentTarget.getBoundingClientRect()
              const clickX = e.clientX - rect.left
              const newRatio = clickX / rect.width
              handleJump(newRatio * 100)
            }}
          >
            <div
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #2563eb, #38bdf8, #00f2fe)',
                width: `${progress}%`,
                borderRadius: 999
              }}
            />
          </div>

          <div style={{ fontSize: '0.76rem', fontWeight: 800, color: '#94a3b8', minWidth: 46, textAlign: 'right' }}>
            {Math.round((progress / 100) * 14)}s / 14s
          </div>
        </div>
      </div>
    </div>
  )
}
