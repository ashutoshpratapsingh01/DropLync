'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
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
  Volume2Icon,
  VolumeXIcon,
  MaximizeIcon,
  MinimizeIcon
} from '@/components/ui/Icons'

interface DemoVideoModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function DemoVideoModal({ isOpen, onClose }: DemoVideoModalProps) {
  const [isPlaying, setIsPlaying] = useState(true)
  const [progress, setProgress] = useState(0) // 0 to 100
  const [copiedLink, setCopiedLink] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [activeSpeech, setActiveSpeech] = useState('')

  const modalRef = useRef<HTMLDivElement>(null)
  const lastTimeRef = useRef<number | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const currentChapterRef = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Voice Narration handler using Web Speech Synthesis
  const speakNarration = useCallback((text: string) => {
    if (!voiceEnabled || typeof window === 'undefined' || !('speechSynthesis' in window)) return

    try {
      window.speechSynthesis.cancel() // Cancel ongoing speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.02
      utterance.pitch = 1.0
      utterance.volume = 0.95

      // Pick a natural voice if available
      const voices = window.speechSynthesis.getVoices()
      const naturalVoice = voices.find(v => (v.name.includes('Natural') || v.name.includes('Google') || v.lang.startsWith('en')) && !v.name.includes('Zira'))
      if (naturalVoice) utterance.voice = naturalVoice

      utterance.onstart = () => setActiveSpeech(text)
      utterance.onend = () => setActiveSpeech('')
      utterance.onerror = () => setActiveSpeech('')

      window.speechSynthesis.speak(utterance)
    } catch (e) {
      console.warn('Speech synthesis not supported or blocked:', e)
    }
  }, [voiceEnabled])

  // Play subtle sound effects with Web Audio API
  const playSoundEffect = useCallback((type: 'drop' | 'chime') => {
    if (!voiceEnabled || typeof window === 'undefined') return
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') ctx.resume()

      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      if (type === 'drop') {
        osc.type = 'sine'
        osc.frequency.setValueAtTime(180, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.12)
        gain.gain.setValueAtTime(0.3, ctx.currentTime)
        gain.gain.linearRampToValueAtTime(0.01, ctx.currentTime + 0.12)
        osc.start()
        osc.stop(ctx.currentTime + 0.12)
      } else if (type === 'chime') {
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(587.33, ctx.currentTime) // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.08) // A5
        gain.gain.setValueAtTime(0.25, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4)
        osc.start()
        osc.stop(ctx.currentTime + 0.4)
      }
    } catch (e) {}
  }, [voiceEnabled])

  // Fullscreen toggle handler
  const toggleFullscreen = useCallback(() => {
    if (!modalRef.current) {
      setIsFullscreen(prev => !prev)
      return
    }

    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => setIsFullscreen(true))
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => setIsFullscreen(false))
    }
  }, [])

  // Listen for fullscreen change events (e.g. Esc key pressed)
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => document.removeEventListener('fullscreenchange', handleFsChange)
  }, [])

  // 60FPS Ultra-Smooth Animation Loop using requestAnimationFrame
  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(true)
      setProgress(0)
      setCopiedLink(false)
      lastTimeRef.current = null
      currentChapterRef.current = 0
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
      return
    }

    if (!isPlaying) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.pause()
      return
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
    }

    const totalDurationMs = 14000 // 14s

    const stepFrame = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp
      const delta = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      setProgress(prev => {
        const next = prev + (delta / totalDurationMs) * 100

        // Trigger voice narrations at specific milestones
        if (next < 32 && currentChapterRef.current !== 1) {
          currentChapterRef.current = 1
          speakNarration('Welcome to DropLync. Simply drag and drop any file up to 10 gigabytes into the dropzone.')
        } else if (next >= 32 && next < 70 && currentChapterRef.current !== 2) {
          currentChapterRef.current = 2
          playSoundEffect('drop')
          speakNarration('DropLync instantly streams your file in 256-bit encrypted chunks with zero speed limits.')
        } else if (next >= 70 && currentChapterRef.current !== 3) {
          currentChapterRef.current = 3
          playSoundEffect('chime')
          speakNarration('Transfer complete! Click Copy Link to share your encrypted file with anyone.')
        }

        if (next >= 82 && !copiedLink) {
          setCopiedLink(true)
        } else if (next < 82 && copiedLink) {
          setCopiedLink(false)
        }

        if (next >= 100) {
          currentChapterRef.current = 0
          setCopiedLink(false)
          return 0
        }
        return next
      })

      animFrameRef.current = requestAnimationFrame(stepFrame)
    }

    animFrameRef.current = requestAnimationFrame(stepFrame)

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    }
  }, [isOpen, isPlaying, speakNarration, playSoundEffect, copiedLink])

  if (!isOpen) return null

  // Calculate smooth cursor positions & state
  let cursorX = 50
  let cursorY = 50
  let cursorClicked = false
  let isDraggingFile = false
  let uploadPercent = 0
  let currentPhase: 1 | 2 | 3 = 1

  if (progress < 32) {
    currentPhase = 1
    const p1 = progress / 32
    if (p1 < 0.28) {
      // Smooth movement towards file
      cursorX = 18 + p1 * 34
      cursorY = 78 - p1 * 22
    } else if (p1 >= 0.28 && p1 < 0.76) {
      // Smooth dragging of file into dropzone center
      isDraggingFile = true
      cursorClicked = true
      const dragRatio = (p1 - 0.28) / 0.48
      cursorX = 27.5 + dragRatio * 22.5
      cursorY = 71.8 - dragRatio * 26.8
    } else {
      // Released into dropzone
      cursorX = 50
      cursorY = 45
      cursorClicked = p1 > 0.88
    }
  } else if (progress >= 32 && progress < 70) {
    currentPhase = 2
    const p2 = (progress - 32) / 38
    uploadPercent = Math.min(100, Math.round(p2 * 100))
    // Smooth wandering cursor
    cursorX = 64 + Math.sin(p2 * Math.PI * 2) * 5
    cursorY = 52 + Math.cos(p2 * Math.PI * 2) * 3
  } else {
    currentPhase = 3
    const p3 = (progress - 70) / 30
    if (p3 < 0.38) {
      cursorX = 50 + p3 * 52
      cursorY = 48 + p3 * 22
    } else {
      cursorX = 70
      cursorY = 57
      cursorClicked = p3 > 0.42
    }
  }

  function handleJump(targetProgress: number) {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setProgress(targetProgress)
    currentChapterRef.current = 0
    setCopiedLink(targetProgress >= 82)
    lastTimeRef.current = performance.now()
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(2, 4, 10, 0.92)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? 0 : '16px',
        animation: 'fadeIn 200ms ease forwards'
      }}
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className="glass-panel"
        style={{
          width: isFullscreen ? '100vw' : '100%',
          maxWidth: isFullscreen ? '100vw' : 920,
          height: isFullscreen ? '100vh' : 'auto',
          maxHeight: isFullscreen ? '100vh' : '92vh',
          background: '#060913',
          borderRadius: isFullscreen ? 0 : 24,
          border: isFullscreen ? 'none' : '1.5px solid var(--border-glow)',
          boxShadow: isFullscreen ? 'none' : 'var(--glass-shadow), 0 35px 90px rgba(0, 0, 0, 0.8)',
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
            padding: '12px 18px',
            background: '#0b1120',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexShrink: 0
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
                padding: '4px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                fontSize: '0.74rem',
                color: '#94a3b8',
                fontFamily: 'monospace'
              }}
            >
              <span style={{ color: '#22c55e' }}>🔒</span>
              <span>https://droplync.vercel.app · 10GB Transfer Walkthrough</span>
            </div>
          </div>

          {/* Window action controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Voice Audio Toggle Button */}
            <button
              onClick={() => {
                if (voiceEnabled) {
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
                  setVoiceEnabled(false)
                } else {
                  setVoiceEnabled(true)
                  currentChapterRef.current = 0
                }
              }}
              style={{
                background: voiceEnabled ? 'rgba(34, 197, 94, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                border: voiceEnabled ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: voiceEnabled ? '#22c55e' : '#94a3b8',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              title={voiceEnabled ? 'Mute Voice Narration' : 'Enable Voice Narration'}
            >
              {voiceEnabled ? <Volume2Icon size={14} /> : <VolumeXIcon size={14} />}
              <span>{voiceEnabled ? 'Voice: ON' : 'Voice: OFF'}</span>
            </button>

            {/* Laptop Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              style={{
                background: isFullscreen ? 'rgba(56, 189, 248, 0.18)' : 'rgba(255, 255, 255, 0.05)',
                border: isFullscreen ? '1px solid rgba(56, 189, 248, 0.4)' : '1px solid rgba(255, 255, 255, 0.1)',
                color: isFullscreen ? '#38bdf8' : '#94a3b8',
                borderRadius: 8,
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              title={isFullscreen ? 'Exit Fullscreen' : 'Laptop Full Screen'}
            >
              {isFullscreen ? <MinimizeIcon size={14} /> : <MaximizeIcon size={14} />}
              <span>{isFullscreen ? 'Exit Full' : 'Full Screen'}</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: 4,
                display: 'flex',
                alignItems: 'center',
                borderRadius: 6
              }}
              title="Close modal"
            >
              <XIcon size={20} />
            </button>
          </div>
        </div>

        {/* Phase Step Navigation */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: '#070b16',
            flexShrink: 0
          }}
        >
          {[
            { phase: 1 as const, label: '1. Select 10GB Files', jump: 0 },
            { phase: 2 as const, label: '2. Direct 256-Bit Stream', jump: 35 },
            { phase: 3 as const, label: '3. Instant Link & 1-Click Copy', jump: 72 }
          ].map(item => {
            const active = currentPhase === item.phase
            return (
              <button
                key={item.phase}
                onClick={() => handleJump(item.jump)}
                style={{
                  padding: '10px 14px',
                  background: active ? 'rgba(37,99,235,0.12)' : 'transparent',
                  border: 'none',
                  borderBottom: active ? '2.5px solid #38bdf8' : '2.5px solid transparent',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 150ms ease'
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 800, color: active ? '#38bdf8' : '#94a3b8' }}>
                  {item.label}
                </div>
              </button>
            )
          })}
        </div>

        {/* Video Canvas Stage (Widescreen 16:9 Cinema Player) */}
        <div
          style={{
            position: 'relative',
            flex: 1,
            width: '100%',
            aspectRatio: isFullscreen ? 'auto' : '16 / 9',
            minHeight: isFullscreen ? 0 : 380,
            background: 'radial-gradient(ellipse at 50% 25%, #0e1a38 0%, #03060e 100%)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            userSelect: 'none'
          }}
          onClick={() => setIsPlaying(!isPlaying)}
        >
          {/* Animated Background Glow */}
          <div
            style={{
              position: 'absolute',
              width: 320,
              height: 320,
              borderRadius: '50%',
              background: '#2563eb',
              filter: 'blur(90px)',
              opacity: 0.22,
              top: '15%',
              left: '35%',
              pointerEvents: 'none'
            }}
          />

          {/* Screencast Watermark / Live Badge */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              left: 18,
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(0,0,0,0.65)',
              backdropFilter: 'blur(12px)',
              padding: '5px 12px',
              borderRadius: 20,
              border: '1px solid rgba(255,255,255,0.12)'
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#ef4444',
                boxShadow: '0 0 10px #ef4444',
                animation: 'pulseDot 1.5s infinite'
              }}
            />
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '0.04em' }}>
              60 FPS SCREENTOUR
            </span>
          </div>

          {/* Real-time Subtitles Banner */}
          {activeSpeech && (
            <div
              style={{
                position: 'absolute',
                bottom: 20,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 15,
                background: 'rgba(0, 0, 0, 0.82)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: 12,
                padding: '6px 18px',
                color: '#ffffff',
                fontSize: '0.84rem',
                fontWeight: 700,
                textAlign: 'center',
                maxWidth: '85%',
                boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                animation: 'fadeIn 200ms ease'
              }}
            >
              🎙️ {activeSpeech}
            </div>
          )}

          {/* ══════ PHASE 1: DRAG & DROP SELECTION ══════ */}
          {currentPhase === 1 && (
            <div
              style={{
                width: '85%',
                maxWidth: 520,
                textAlign: 'center',
                position: 'relative',
                animation: 'fadeIn 200ms ease'
              }}
            >
              <div
                style={{
                  border: isDraggingFile ? '2.5px dashed #38bdf8' : '2px dashed rgba(37,99,235,0.5)',
                  borderRadius: 24,
                  padding: '42px 24px',
                  background: isDraggingFile ? 'rgba(56, 189, 248, 0.14)' : 'rgba(15, 23, 42, 0.8)',
                  boxShadow: isDraggingFile ? '0 0 40px rgba(56,189,248,0.35)' : '0 12px 35px rgba(0,0,0,0.5)',
                  transition: 'all 150ms ease'
                }}
              >
                <div
                  style={{
                    width: 58,
                    height: 58,
                    borderRadius: 18,
                    background: 'linear-gradient(135deg, #2563eb, #0284c7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 14px',
                    boxShadow: '0 10px 25px rgba(37,99,235,0.5)'
                  }}
                >
                  <UploadCloudIcon size={32} color="white" />
                </div>

                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', marginBottom: 6 }}>
                  {isDraggingFile ? 'Release to Drop 10GB File' : 'Drop your files to start transfer'}
                </div>
                <div style={{ fontSize: '0.86rem', color: '#94a3b8' }}>
                  Send up to <strong style={{ color: '#38bdf8' }}>10GB Free</strong> · End-to-End Encrypted
                </div>
              </div>

              {/* Draggable File Floating Badge */}
              <div
                style={{
                  position: 'absolute',
                  left: isDraggingFile ? '50%' : '14%',
                  top: isDraggingFile ? '50%' : '82%',
                  transform: 'translate(-50%, -50%)',
                  background: 'linear-gradient(135deg, #1e293b, #0f172a)',
                  border: '1.5px solid #38bdf8',
                  borderRadius: 14,
                  padding: '10px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  boxShadow: '0 15px 35px rgba(0,0,0,0.7)',
                  pointerEvents: 'none',
                  zIndex: 20,
                  transition: 'all 80ms linear'
                }}
              >
                <FileIcon size={20} color="#38bdf8" />
                <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#ffffff' }}>
                  Video_Master_Edit_4.8GB.zip
                </span>
                <span style={{ fontSize: '0.74rem', color: '#22c55e', fontWeight: 800 }}>4.8 GB</span>
              </div>
            </div>
          )}

          {/* ══════ PHASE 2: STREAMING & ENCRYPTION ══════ */}
          {currentPhase === 2 && (
            <div
              style={{
                width: '85%',
                maxWidth: 520,
                textAlign: 'center',
                position: 'relative',
                animation: 'fadeIn 200ms ease'
              }}
            >
              <div
                style={{
                  padding: '34px 28px',
                  borderRadius: 24,
                  border: '1.5px solid rgba(56,189,248,0.45)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  boxShadow: '0 15px 50px rgba(37,99,235,0.3)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#f8fafc' }}>
                      Streaming Direct Chunks...
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: 3 }}>
                      AES-256 GCM · Line Speed: <strong style={{ color: '#38bdf8' }}>112.5 MB/s</strong>
                    </div>
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#38bdf8' }}>
                    {uploadPercent}%
                  </div>
                </div>

                {/* Glowing Smooth Progress Bar */}
                <div
                  style={{
                    height: 14,
                    borderRadius: 999,
                    background: 'rgba(255, 255, 255, 0.1)',
                    overflow: 'hidden',
                    marginBottom: 18,
                    border: '1px solid rgba(255,255,255,0.14)'
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      borderRadius: 999,
                      background: 'linear-gradient(90deg, #2563eb, #0284c7, #00f2fe)',
                      width: `${uploadPercent}%`,
                      transition: 'width 40ms linear',
                      boxShadow: '0 0 20px rgba(0,242,254,0.8)'
                    }}
                  />
                </div>

                {/* Offset & Telemetry */}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                    Uploaded: {((uploadPercent / 100) * 4.8).toFixed(2)} GB / 4.80 GB
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#22c55e', fontWeight: 800 }}>
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
                width: '85%',
                maxWidth: 520,
                textAlign: 'center',
                position: 'relative',
                animation: 'fadeIn 200ms ease'
              }}
            >
              <div
                style={{
                  padding: '32px 28px',
                  borderRadius: 24,
                  border: '1.5px solid rgba(34,197,94,0.45)',
                  background: 'rgba(15, 23, 42, 0.92)',
                  boxShadow: '0 15px 50px rgba(34,197,94,0.25)'
                }}
              >
                <div
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: '50%',
                    background: 'rgba(34,197,94,0.15)',
                    border: '2px solid #22c55e',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 12px',
                    boxShadow: '0 0 24px rgba(34,197,94,0.4)'
                  }}
                >
                  <CheckCircleIcon size={28} color="#22c55e" />
                </div>

                <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#f8fafc', marginBottom: 4 }}>
                  Transfer Ready to Share!
                </div>
                <div style={{ fontSize: '0.84rem', color: '#94a3b8', marginBottom: 16 }}>
                  Auto-expires in 7 days · 10GB Payload Encrypted
                </div>

                {/* Instant Link Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    background: '#060a14',
                    border: copiedLink ? '1.5px solid #22c55e' : '1px solid rgba(255,255,255,0.16)',
                    borderRadius: 14,
                    padding: '10px 16px',
                    boxShadow: copiedLink ? '0 0 20px rgba(34,197,94,0.35)' : 'none',
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
                      fontSize: '0.88rem',
                      fontWeight: 800,
                      width: '100%',
                      outline: 'none',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button
                    className="btn-primary"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      flexShrink: 0,
                      background: copiedLink ? '#16a34a' : '#2563eb'
                    }}
                  >
                    {copiedLink ? (
                      <>
                        <CheckIcon size={14} color="white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon size={14} />
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
              transition: 'left 40ms linear, top 40ms linear, transform 80ms ease',
              filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.8))'
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <polygon points="0 0 0 20 5.5 15.5 10 24 13 22.5 8.5 14 16 14" fill="#ffffff" stroke="#000000" strokeWidth="1.5" />
            </svg>
            {cursorClicked && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  left: -2,
                  width: 32,
                  height: 32,
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
            padding: '14px 20px',
            background: '#0b1120',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexShrink: 0
          }}
        >
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: 38,
              height: 38,
              borderRadius: '50%',
              background: '#2563eb',
              border: 'none',
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              boxShadow: '0 4px 14px rgba(37,99,235,0.5)'
            }}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon size={18} /> : <PlayIcon size={18} />}
          </button>

          <button
            onClick={() => handleJump(0)}
            title="Replay from beginning"
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
            <RotateCcwIcon size={18} />
          </button>

          {/* Interactive Timeline Bar */}
          <div
            style={{
              flex: 1,
              height: 8,
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

          <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#94a3b8', minWidth: 50, textAlign: 'right' }}>
            {Math.round((progress / 100) * 14)}s / 14s
          </div>
        </div>
      </div>
    </div>
  )
}
