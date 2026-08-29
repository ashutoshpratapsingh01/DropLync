'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import { formatBytes } from '@/lib/utils'
import Background3D from '@/components/Background3D'
import Tilt3D from '@/components/ui/Tilt3D'
import UpgradeModal from '@/components/ui/UpgradeModal'
import DemoVideoModal from '@/components/DemoVideoModal'
import Logo from '@/components/Logo'
import AdBanner from '@/components/AdBanner'
import { FREE_LIMIT_BYTES } from '@/lib/plans'
import {
  UploadCloudIcon,
  ArrowUpTrayIcon,
  ShieldLockIcon,
  CheckCircleIcon,
  ServerStackIcon,
  ZapIcon,
  DiamondIcon,
  ClockIcon,
  LockIcon,
  CheckIcon,
  XIcon,
  FileIcon,
  LinkIcon,
  MailIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  AlertTriangleIcon,
  SpinnerIcon,
  BarChartIcon,
  PlayIcon,
  WhatsAppIcon,
  TelegramIcon,
  TwitterXIcon,
  ShareSheetIcon
} from '@/components/ui/Icons'

type UploadFile = {
  id: string
  file: File
  progress: number
  uploadedBytes: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
}

type Step = 'upload' | 'settings' | 'success'
type TransferResult = {
  token: string
  url: string
  expiresAt: string
  fileCount: number
  totalSize: number
  deliveryMode?: 'link' | 'email'
  recipients?: string[]
}

const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB chunks

export default function LandingClient() {
  useScrollReveal()
  const [step, setStep] = useState<Step>('upload')
  const [files, setFiles] = useState<UploadFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [deliveryMode, setDeliveryMode] = useState<'link' | 'email'>('link')
  const [recipientEmails, setRecipientEmails] = useState('')
  const [senderEmail, setSenderEmail] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [transferName, setTransferName] = useState('')
  const [expiry, setExpiry] = useState('7')
  const [maxDownloads, setMaxDownloads] = useState('0')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [creating, setCreating] = useState(false)
  const [result, setResult] = useState<TransferResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  
  // User subscription state
  const [userPlan, setUserPlan] = useState<string>('free')
  const [maxAllowedBytes, setMaxAllowedBytes] = useState<bigint>(FREE_LIMIT_BYTES)
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false)
  const [exceededSizeDisplay, setExceededSizeDisplay] = useState<string>('')
  
  // Real-time telemetry
  const [uploadSpeed, setUploadSpeed] = useState<string>('0 MB/s')
  const [eta, setEta] = useState<string>('')
  
  // Interactive Video Demo modal
  const [demoModalOpen, setDemoModalOpen] = useState(false)

  // Upload Guard & Abort Controller
  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [pendingNavigation, setPendingNavigation] = useState<string | (() => void) | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isUploading = files.some(f => f.status === 'uploading')
  const isBusy = isUploading || creating

  // 1. Guard against window close, tab close, or refresh
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isBusy) {
        e.preventDefault()
        e.returnValue = ''
        return ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isBusy])

  // 2. Guard against in-app link clicks and navigation tabs
  useEffect(() => {
    if (!isBusy) return

    const handleDocumentClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('a, button[data-nav]') as HTMLElement | null
      if (target) {
        if (target.closest('.cancel-modal-content')) return

        const href = target.getAttribute('href')
        if (href && href !== '#' && !href.startsWith('javascript:')) {
          e.preventDefault()
          e.stopPropagation()
          setPendingNavigation(href)
          setCancelModalOpen(true)
        }
      }
    }

    document.addEventListener('click', handleDocumentClick, true)
    return () => document.removeEventListener('click', handleDocumentClick, true)
  }, [isBusy])

  // 3. Guard against browser back/forward history navigation
  useEffect(() => {
    if (!isBusy) return

    window.history.pushState(null, '', window.location.href)
    const handlePopState = () => {
      if (isBusy) {
        window.history.pushState(null, '', window.location.href)
        setPendingNavigation(() => window.history.back())
        setCancelModalOpen(true)
      }
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [isBusy])

  // Abort and cancel upload
  function handleConfirmCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setCreating(false)
    setFiles(prev => prev.map(f => ({ ...f, status: 'pending', progress: 0, uploadedBytes: 0 })))
    setStep('upload')
    setUploadSpeed('0 MB/s')
    setEta('')
    setCancelModalOpen(false)

    if (typeof pendingNavigation === 'string') {
      window.location.href = pendingNavigation
    } else if (typeof pendingNavigation === 'function') {
      pendingNavigation()
    }
    setPendingNavigation(null)
  }

  function handleStay() {
    setCancelModalOpen(false)
    setPendingNavigation(null)
  }

  // Fetch current user plan from server (single source of truth)
  const refreshPlan = useCallback(() => {
    fetch('/api/user/subscription')
      .then(res => res.json())
      .then(data => {
        if (data.success && data.data) {
          const plan = data.data.plan || 'free'
          setUserPlan(plan)
          if (plan === 'pro') setMaxAllowedBytes(BigInt(50) * BigInt(1024 * 1024 * 1024))
          else if (plan === 'ultra') setMaxAllowedBytes(BigInt(200) * BigInt(1024 * 1024 * 1024))
          else if (plan === 'enterprise') setMaxAllowedBytes(BigInt(1000) * BigInt(1024 * 1024 * 1024))
          else setMaxAllowedBytes(FREE_LIMIT_BYTES)
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    refreshPlan()
    if (typeof window !== 'undefined' && window.location.hash === '#features') {
      setTimeout(() => {
        const el = document.getElementById('features')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [refreshPlan])

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles)
    const newTotal = arr.reduce((acc, f) => acc + f.size, 0)
    
    // Check if adding exceeds current allowed tier
    if (BigInt(newTotal) > maxAllowedBytes) {
      setExceededSizeDisplay(formatBytes(newTotal))
      setUpgradeModalOpen(true)
    }

    setFiles(prev => [
      ...prev,
      ...arr.map(f => ({
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        file: f,
        progress: 0,
        uploadedBytes: 0,
        status: 'pending' as const
      }))
    ])
    setStep('upload')
  }, [maxAllowedBytes])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files)
  }, [addFiles])

  const removeFile = (id: string) => setFiles(prev => prev.filter(f => f.id !== id))

  /**
   * Resilient chunk upload with retry mechanism & real-time telemetry
   */
  async function uploadSingleChunkWithRetry(
    fileId: string,
    chunk: Blob,
    chunkIndex: number,
    totalChunks: number,
    uploadToken?: string,
    signal?: AbortSignal,
    retries = 4
  ): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      if (signal?.aborted) throw new Error('Upload cancelled')
      try {
        const fd = new FormData()
        fd.append('chunk', chunk)
        fd.append('chunkIndex', String(chunkIndex))
        fd.append('totalChunks', String(totalChunks))
        fd.append('chunkSize', String(CHUNK_SIZE))

        const res = await fetch(`/api/uploads/${fileId}/chunk`, {
          method: 'POST',
          headers: uploadToken ? { 'x-transfer-token': uploadToken } : {},
          body: fd,
          signal
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          if (attempt === retries) {
            throw new Error(errData.error || `Chunk ${chunkIndex + 1}/${totalChunks} upload failed (${res.status} ${res.statusText})`)
          }
          await new Promise(resolve => setTimeout(resolve, attempt * 800))
          continue
        }
        return
      } catch (err: any) {
        if (signal?.aborted || err.name === 'AbortError') {
          throw new Error('Upload cancelled by user')
        }
        if (attempt === retries) {
          throw new Error(err.message || `Chunk ${chunkIndex + 1}/${totalChunks} upload failed after ${retries} attempts`)
        }
        await new Promise(resolve => setTimeout(resolve, attempt * 800))
      }
    }
  }

  async function uploadFile(
    uf: UploadFile,
    transferId: string,
    uploadToken: string,
    signal: AbortSignal | undefined,
    onProgressUpdate: (bytesJustUploaded: number) => void
  ): Promise<{ fileId: string; size: number }> {
    const totalChunks = Math.ceil(uf.file.size / CHUNK_SIZE) || 1

    const initRes = await fetch('/api/uploads/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-transfer-token': uploadToken
      },
      body: JSON.stringify({
        transferId,
        filename: uf.file.name,
        mimeType: uf.file.type || 'application/octet-stream',
        size: uf.file.size,
        totalChunks
      }),
      signal
    })

    if (!initRes.ok) {
      const errData = await initRes.json().catch(() => ({}))
      if (initRes.status === 403) {
        setExceededSizeDisplay(formatBytes(uf.file.size))
        setUpgradeModalOpen(true)
      }
      throw new Error(errData.error || 'Failed to initiate file upload session')
    }

    const { fileId } = await initRes.json()

    let bytesUploadedForFile = 0

    for (let i = 0; i < totalChunks; i++) {
      if (signal?.aborted) throw new Error('Upload cancelled by user')
      const start = i * CHUNK_SIZE
      const end = Math.min(start + CHUNK_SIZE, uf.file.size)
      const chunk = uf.file.slice(start, end)
      const currentChunkLength = end - start

      await uploadSingleChunkWithRetry(fileId, chunk, i, totalChunks, uploadToken, signal)

      bytesUploadedForFile += currentChunkLength
      onProgressUpdate(currentChunkLength)

      const filePercent = Math.min(100, Math.round((bytesUploadedForFile / uf.file.size) * 100))
      setFiles(prev =>
        prev.map(f =>
          f.id === uf.id
            ? { ...f, progress: filePercent, uploadedBytes: bytesUploadedForFile }
            : f
        )
      )
    }

    const completeRes = await fetch(`/api/uploads/${fileId}/complete`, {
      method: 'POST',
      headers: { 'x-transfer-token': uploadToken },
      signal
    })

    if (!completeRes.ok) {
      const errData = await completeRes.json().catch(() => ({}))
      throw new Error(errData.error || 'Failed to finalize file on server')
    }

    return { fileId, size: uf.file.size }
  }

  async function handleCreate() {
    if (!files.length) return
    if (password && password !== passwordConfirm) {
      setError('Passwords do not match')
      return
    }

    if (deliveryMode === 'email') {
      if (!recipientEmails.trim()) {
        setError('Please provide at least one recipient email address')
        return
      }
      if (!senderEmail.trim() || !senderEmail.includes('@')) {
        setError('Please provide your valid sender email address')
        return
      }
    }

    // Client-side quota guard
    const overallTotalBytes = files.reduce((s, f) => s + f.file.size, 0)
    if (BigInt(overallTotalBytes) > maxAllowedBytes) {
      setExceededSizeDisplay(formatBytes(overallTotalBytes))
      setUpgradeModalOpen(true)
      return
    }

    setError('')
    setCreating(true)
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    try {
      const transferRes = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: transferName || `Transfer ${new Date().toLocaleDateString()}`,
          expiryDays: parseInt(expiry) || 7,
          maxDownloads: parseInt(maxDownloads) || 0,
          password: password || undefined
        }),
        signal
      })

      if (!transferRes.ok) {
        const errData = await transferRes.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create transfer session')
      }

      const { transferId, token, uploadToken, expiresAt } = await transferRes.json()
      const effectiveUploadToken = uploadToken || token

      setFiles(prev => prev.map(f => ({ ...f, status: 'uploading', progress: 0, uploadedBytes: 0 })))
      setStep('upload')

      let totalUploadedBytes = 0
      let lastTelemetryTime = Date.now()
      let bytesSinceLastTelemetry = 0

      const handleChunkTelemetry = (chunkBytes: number) => {
        totalUploadedBytes += chunkBytes
        bytesSinceLastTelemetry += chunkBytes
        const now = Date.now()
        const timeDiff = (now - lastTelemetryTime) / 1000

        if (timeDiff >= 0.5) {
          const speedBytesPerSec = bytesSinceLastTelemetry / timeDiff
          setUploadSpeed(`${(speedBytesPerSec / (1024 * 1024)).toFixed(1)} MB/s`)

          const remainingBytes = Math.max(0, overallTotalBytes - totalUploadedBytes)
          if (speedBytesPerSec > 0) {
            const secondsLeft = Math.round(remainingBytes / speedBytesPerSec)
            if (secondsLeft < 60) {
              setEta(`${secondsLeft}s left`)
            } else {
              const mins = Math.floor(secondsLeft / 60)
              const secs = secondsLeft % 60
              setEta(`${mins}m ${secs}s left`)
            }
          }
          lastTelemetryTime = now
          bytesSinceLastTelemetry = 0
        }
      }

      let successCount = 0
      let totalSize = 0

      for (const uf of files) {
        if (signal?.aborted) break
        try {
          const { size } = await uploadFile(uf, transferId, effectiveUploadToken, signal, handleChunkTelemetry)
          totalSize += size
          successCount++
          setFiles(prev =>
            prev.map(f => (f.id === uf.id ? { ...f, status: 'done', progress: 100 } : f))
          )
        } catch (err: any) {
          if (signal?.aborted || err.name === 'AbortError') {
            console.log('Upload aborted by user')
            return
          }
          console.error(`Upload error for ${uf.file.name}:`, err)
          setFiles(prev =>
            prev.map(f =>
              f.id === uf.id ? { ...f, status: 'error', error: err.message || 'Upload failed' } : f
            )
          )
        }
      }

      if (signal?.aborted) return

      if (successCount === 0) {
        setError('All file uploads failed. Please check network connection and try again.')
        setCreating(false)
        return
      }

      let finalData: any = null
      try {
        const finalizeRes = await fetch(`/api/transfers/${transferId}/finalize`, {
          method: 'POST',
          headers: { 'x-transfer-token': effectiveUploadToken },
          signal
        })
        if (finalizeRes.ok) {
          finalData = await finalizeRes.json()
        }
      } catch (e) {
        console.warn('Finalize request warning:', e)
      }

      const transferToken = finalData?.token || token
      const expiryDate = finalData?.expiresAt || expiresAt

      const recipientsList = deliveryMode === 'email'
        ? recipientEmails.split(',').map(e => e.trim()).filter(Boolean)
        : []

      // If email delivery mode, dispatch emails
      if (deliveryMode === 'email' && recipientsList.length > 0) {
        try {
          await fetch(`/api/share/${transferToken}/email`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              recipientEmails: recipientsList,
              senderEmail,
              message: emailMessage
            }),
            signal
          })
        } catch (mailErr) {
          console.warn('Mail dispatch warning:', mailErr)
        }
      }

      setResult({
        token: transferToken,
        url: `${window.location.origin}/f/${transferToken}`,
        expiresAt: expiryDate,
        fileCount: successCount,
        totalSize: totalSize || overallTotalBytes,
        deliveryMode,
        recipients: recipientsList
      })

      if (files.length > successCount) {
        setError(`${files.length - successCount} file(s) failed, but your link is ready with ${successCount} file(s).`)
      }

      setStep('success')
    } catch (err: any) {
      if (signal?.aborted || err.name === 'AbortError') {
        console.log('Transfer creation cancelled')
        return
      }
      setError(err.message || 'Something went wrong during transfer creation')
    } finally {
      setCreating(false)
      setUploadSpeed('0 MB/s')
      setEta('')
    }
  }

  async function copyLink() {
    if (!result) return
    await navigator.clipboard.writeText(result.url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function reset() {
    setFiles([])
    setStep('upload')
    setResult(null)
    setTransferName('')
    setPassword('')
    setPasswordConfirm('')
    setRecipientEmails('')
    setEmailMessage('')
    setError('')
  }

  const totalSize = files.reduce((s, f) => s + f.file.size, 0)
  const isOverFreeLimit = totalSize > 10 * 1024 * 1024 * 1024 && userPlan === 'free'

  return (
    <main style={{ position: 'relative', overflow: 'hidden' }}>
      {/* ── 3D Ambient Canvas Background ── */}
      <Background3D />

      {/* ── Glowing Mesh Orbs ── */}
      <div className="ambient-orb-container">
        <div className="orb orb-primary" />
        <div className="orb orb-accent" />
        <div className="orb orb-indigo" />
      </div>

      {/* ── HERO SECTION - Fit-to-screen Optimized ── */}
      <section className="hero-bg" style={{ minHeight: 'calc(100vh - 68px)', display: 'flex', alignItems: 'center', padding: '24px 0 36px', position: 'relative', zIndex: 1 }}>
        <div className="section-container" style={{ width: '100%' }}>
          <div className="responsive-grid-hero">

            {/* Left: Copy & Value Props */}
            <div>
              <div className="reveal" style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span className="stat-pill" style={{ padding: '5px 14px', fontSize: '0.8rem', borderColor: 'rgba(37,99,235,0.3)', background: 'rgba(37,99,235,0.08)' }}>
                  <span className="pulse-dot" style={{ width: 7, height: 7 }} />
                  <span style={{ fontWeight: 800, color: 'var(--brand)', letterSpacing: '0.02em' }}>
                    10GB Free Storage · Direct Stream
                  </span>
                </span>
                <button
                  onClick={() => setDemoModalOpen(true)}
                  className="btn-secondary"
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    borderRadius: 999,
                    cursor: 'pointer'
                  }}
                >
                  <PlayIcon size={12} color="var(--brand)" />
                  <span>Watch Demo (14s)</span>
                </button>
              </div>

              <h1 className="reveal reveal-delay-1" style={{ fontSize: 'clamp(2rem, 3.2vw, 2.9rem)', fontWeight: 900, lineHeight: 1.14, marginBottom: 14, letterSpacing: '-0.04em', color: 'var(--text-1)' }}>
                Send large files.<br />
                <span className="gradient-text">Fast, private & zero friction.</span>
              </h1>

              <p className="reveal reveal-delay-2" style={{ fontSize: '0.98rem', color: 'var(--text-2)', maxWidth: 460, lineHeight: 1.62, marginBottom: 20 }}>
                Drop your files to generate an instant, 256-bit encrypted link. Upload <strong>up to 10GB free</strong>, or check our dedicated <a href="/pricing" style={{ color: 'var(--brand)', fontWeight: 800, textDecoration: 'underline' }}>Pricing Plans</a> for <strong>50GB to 200GB+</strong>.
              </p>

              {/* Compact Feature Checkmark Cards */}
              <div className="reveal reveal-delay-2 responsive-grid-2" style={{ marginBottom: 22, maxWidth: 440 }}>
                {[
                  { title: '10GB Free per Transfer', icon: <ZapIcon size={16} color="var(--brand)" /> },
                  { title: 'Pro Tiers up to 200GB', icon: <DiamondIcon size={16} color="var(--brand)" /> },
                  { title: 'Direct Chunk Streaming', icon: <ShieldLockIcon size={16} color="var(--brand)" /> },
                  { title: 'Auto-Expiring Links', icon: <ClockIcon size={16} color="var(--brand)" /> }
                ].map((item, i) => (
                  <div key={i} className="card-soft card-hover" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 12 }}>
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-1)' }}>{item.title}</span>
                  </div>
                ))}
              </div>

              {/* Compact social proof avatar stack */}
              <div className="reveal reveal-delay-3" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ display: 'flex' }}>
                  {['#2563eb','#0284c7','#06b6d4','#059669','#3b82f6'].map((c, i) => (
                    <div key={i} style={{ width: 30, height: 30, borderRadius: '50%', background: c, border: '2px solid var(--bg)', marginLeft: i > 0 ? -10 : 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} />
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '0.84rem', color: 'var(--text-1)', fontWeight: 800 }}>Over 50,000+ files transferred</div>
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-3)' }}>10GB Free Tier · High-speed multi-part delivery</div>
                </div>
              </div>
            </div>

            {/* Right: Screen-Balanced 3D Interactive Glass Widget */}
            <div className="reveal reveal-delay-2" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
              <Tilt3D intensity={6} glare={true} className="glass-panel" style={{ padding: '20px 16px', borderRadius: 24, width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                {step === 'upload' && (
                  <UploadStep
                    files={files}
                    dragOver={dragOver}
                    setDragOver={setDragOver}
                    onDrop={onDrop}
                    addFiles={addFiles}
                    removeFile={removeFile}
                    fileInputRef={fileInputRef}
                    totalSize={totalSize}
                    userPlan={userPlan}
                    isOverFreeLimit={isOverFreeLimit}
                    onOpenUpgrade={() => {
                      setExceededSizeDisplay(formatBytes(totalSize))
                      setUpgradeModalOpen(true)
                    }}
                    uploadSpeed={uploadSpeed}
                    eta={eta}
                    onCancelUpload={() => setCancelModalOpen(true)}
                    onNext={() => {
                      if (isOverFreeLimit) {
                        setExceededSizeDisplay(formatBytes(totalSize))
                        setUpgradeModalOpen(true)
                        return
                      }
                      setStep('settings')
                    }}
                  />
                )}
                {step === 'settings' && (
                  <SettingsStep
                    files={files}
                    totalSize={totalSize}
                    deliveryMode={deliveryMode}
                    setDeliveryMode={setDeliveryMode}
                    recipientEmails={recipientEmails}
                    setRecipientEmails={setRecipientEmails}
                    senderEmail={senderEmail}
                    setSenderEmail={setSenderEmail}
                    emailMessage={emailMessage}
                    setEmailMessage={setEmailMessage}
                    transferName={transferName}
                    setTransferName={setTransferName}
                    expiry={expiry}
                    setExpiry={setExpiry}
                    maxDownloads={maxDownloads}
                    setMaxDownloads={setMaxDownloads}
                    password={password}
                    setPassword={setPassword}
                    passwordConfirm={passwordConfirm}
                    setPasswordConfirm={setPasswordConfirm}
                    error={error}
                    creating={creating}
                    onBack={() => setStep('upload')}
                    onCreate={handleCreate}
                  />
                )}
                {step === 'success' && result && (
                  <SuccessStep result={result} copied={copied} onCopy={copyLink} onReset={reset} />
                )}
              </Tilt3D>
            </div>

          </div>
        </div>
      </section>

      {/* ── 3D FEATURES SHOWCASE & GIANT STAT CARDS ── */}
      <section id="features" className="section-alt" style={{ minHeight: 'calc(100vh - 68px)', display: 'flex', alignItems: 'center', padding: '32px 0 40px', position: 'relative' }}>
        <div className="section-container" style={{ width: '100%' }}>
          <div className="responsive-grid-features">
            <div>
              <p className="reveal" style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--brand)', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                Engineered for Performance
              </p>
              <h2 className="reveal reveal-delay-1" style={{ fontSize: 'clamp(1.75rem, 2.5vw, 2.3rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 10, lineHeight: 1.2 }}>
                Flexible storage boundaries from 10GB to 200GB+
              </h2>
              <p className="reveal reveal-delay-2" style={{ color: 'var(--text-2)', fontSize: '0.92rem', lineHeight: 1.55, marginBottom: 20 }}>
                High-throughput streams, custom chunk offsets, and 3D visual responsiveness built for speed.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {FEATURES.map((f, i) => (
                  <div key={i} className={`reveal reveal-delay-${i + 1}`} style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
                    <div className="feature-icon" style={{ width: 38, height: 38, fontSize: '1.2rem', borderRadius: 10, background: f.bg, flexShrink: 0 }}>{f.icon}</div>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.92rem', marginBottom: 1, color: 'var(--text-1)' }}>{f.title}</div>
                      <div style={{ color: 'var(--text-2)', fontSize: '0.8rem', lineHeight: 1.45 }}>{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Giant Stat Cards */}
            <div className="reveal reveal-delay-2">
              <div className="responsive-grid-2">
                {STATS.map((s, i) => (
                  <Tilt3D key={i} intensity={6}>
                    <div className="card card-hover" style={{ padding: '22px 18px', textAlign: 'center', minHeight: 115, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ fontSize: '2.1rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: 4 }} className="gradient-text">
                        {s.value}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-2)', fontWeight: 700 }}>{s.label}</div>
                    </div>
                  </Tilt3D>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER (Ultra-Sleek & Compact) ── */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '16px 0', background: 'var(--glass-bg-subtle)', backdropFilter: 'blur(16px)' }}>
        <div className="section-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <Logo height={24} />
            <div style={{ display: 'flex', gap: 20 }}>
              <a href="/pricing" style={{ fontSize: '0.8rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Pricing & Plans</a>
              <a href="/privacy" style={{ fontSize: '0.8rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Privacy Policy</a>
              <a href="/terms" style={{ fontSize: '0.8rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Terms of Service</a>
              <a href="/security" style={{ fontSize: '0.8rem', color: 'var(--text-3)', textDecoration: 'none', fontWeight: 600 }}>Security</a>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>© 2026 DropLync. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* ── Interactive Video Demo Modal ── */}
      <DemoVideoModal isOpen={demoModalOpen} onClose={() => setDemoModalOpen(false)} />

      {/* ── 3D Upgrade Modal ── */}
      <UpgradeModal isOpen={upgradeModalOpen} onClose={() => setUpgradeModalOpen(false)} currentFileSizeDisplay={exceededSizeDisplay} currentLimitDisplay="10GB" onSuccess={() => { setUpgradeModalOpen(false); refreshPlan(); }} />

      {/* ── Cancel Ongoing Upload Confirmation Modal ── */}
      <CancelTransferModal isOpen={cancelModalOpen} onStay={handleStay} onConfirmCancel={handleConfirmCancel} />
    </main>
  )
}

// ── Sub-components ──

function CancelTransferModal({
  isOpen,
  onStay,
  onConfirmCancel
}: {
  isOpen: boolean
  onStay: () => void
  onConfirmCancel: () => void
}) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        background: 'rgba(0, 0, 0, 0.72)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        animation: 'fadeIn 200ms ease forwards'
      }}
    >
      <div
        className="glass-panel cancel-modal-content"
        style={{
          width: '100%',
          maxWidth: 440,
          padding: '28px 24px',
          borderRadius: 24,
          background: 'var(--glass-bg)',
          border: '1.5px solid rgba(220,38,38,0.35)',
          boxShadow: '0 24px 60px rgba(0,0,0,0.5), 0 0 35px rgba(220,38,38,0.25)',
          textAlign: 'center',
          position: 'relative'
        }}
      >
        {/* Warning Badge */}
        <div
          style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            margin: '0 auto 16px',
            background: 'linear-gradient(135deg, rgba(220,38,38,0.18), rgba(245,158,11,0.18))',
            border: '1.5px solid rgba(220,38,38,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(220,38,38,0.25)'
          }}
        >
          <AlertTriangleIcon size={28} color="#dc2626" />
        </div>

        <h3
          style={{
            fontSize: '1.28rem',
            fontWeight: 900,
            color: 'var(--text-1)',
            letterSpacing: '-0.02em',
            marginBottom: 8
          }}
        >
          Cancel Ongoing Upload?
        </h3>

        <p
          style={{
            fontSize: '0.88rem',
            color: 'var(--text-2)',
            lineHeight: 1.55,
            marginBottom: 24
          }}
        >
          Your files are currently streaming to the secure server. Leaving or changing tabs now will <strong>abort the transfer</strong> and discard all progress.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <button
            onClick={onStay}
            className="btn-primary"
            style={{
              padding: '12px 16px',
              fontSize: '0.86rem',
              fontWeight: 800,
              borderRadius: 12,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              boxShadow: '0 4px 14px rgba(37,99,235,0.35)'
            }}
          >
            <span>Stay & Continue</span>
          </button>

          <button
            onClick={onConfirmCancel}
            style={{
              padding: '12px 16px',
              fontSize: '0.86rem',
              fontWeight: 800,
              borderRadius: 12,
              background: 'rgba(220,38,38,0.12)',
              border: '1.5px solid rgba(220,38,38,0.35)',
              color: '#dc2626',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              transition: 'all 180ms ease'
            }}
          >
            <span>Cancel & Leave</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function HolographicProgress({ progress, status, id }: { progress: number; status: string; id: string }) {
  const size = 42
  const strokeW = 4
  const r = (size - strokeW * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (Math.min(progress, 100) / 100) * circ
  const gradId = `pg-${id}`

  if (status === 'done') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgba(5,150,105,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, border: '2px solid #059669',
        boxShadow: '0 0 14px rgba(5,150,105,0.3)'
      }}>
        <CheckIcon size={18} color="#059669" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: 'rgba(220,38,38,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, border: '2px solid #dc2626',
        boxShadow: '0 0 14px rgba(220,38,38,0.3)'
      }}>
        <XIcon size={18} color="#dc2626" />
      </div>
    )
  }

  if (status === 'pending') {
    return (
      <div style={{
        width: size, height: size, borderRadius: 12,
        background: 'rgba(37,99,235,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        border: '1px solid rgba(37,99,235,0.25)'
      }}>
        <FileIcon size={20} color="var(--brand)" />
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', position: 'absolute', top: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(203,213,225,0.35)" strokeWidth={strokeW} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth={strokeW}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.25s ease' }}
        />
      </svg>
      <span style={{ fontSize: '0.62rem', fontWeight: 900, color: 'var(--brand)', lineHeight: 1, zIndex: 1 }}>
        {progress}%
      </span>
    </div>
  )
}

function UploadStep({
  files,
  dragOver,
  setDragOver,
  onDrop,
  addFiles,
  removeFile,
  fileInputRef,
  totalSize,
  userPlan,
  isOverFreeLimit,
  onOpenUpgrade,
  uploadSpeed,
  eta,
  onCancelUpload,
  onNext
}: any) {
  const isUploading = files.some((f: UploadFile) => f.status === 'uploading')
  const overallProgress =
    files.length > 0
      ? Math.round(files.reduce((s: number, f: UploadFile) => s + f.progress, 0) / files.length)
      : 0
  const doneCount = files.filter((f: UploadFile) => f.status === 'done').length

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 16 }}>
        {isUploading ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span>Uploading Files... ({doneCount}/{files.length} ready)</span>
                  {onCancelUpload && (
                    <button
                      onClick={onCancelUpload}
                      title="Cancel active upload"
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(220,38,38,0.1)',
                        border: '1px solid rgba(220,38,38,0.25)',
                        color: '#dc2626',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', display: 'flex', gap: 10, marginTop: 3 }}>
                  <span>Speed: <strong style={{ color: 'var(--brand)' }}>{uploadSpeed}</strong></span>
                  {eta && <span>· {eta}</span>}
                </div>
              </div>
              <div style={{ fontSize: '1.15rem', fontWeight: 900 }} className="gradient-text">{overallProgress}%</div>
            </div>
            <div style={{ height: 8, background: 'var(--glass-bg)', borderRadius: 999, overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{
                height: '100%',
                borderRadius: 999,
                background: 'linear-gradient(90deg, #2563eb, #0284c7, #06b6d4)',
                width: `${overallProgress}%`,
                transition: 'width 0.3s ease',
                boxShadow: '0 0 14px rgba(37,99,235,0.6)'
              }} />
            </div>
          </>
        ) : (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '1.18rem', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
                Upload & Transfer
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#059669' }} />
                <span>{userPlan === 'free' ? '10GB Free Tier' : userPlan === 'pro' ? '50GB Pro Tier' : '200GB Ultra Tier'}</span>
                <span>·</span>
                <span>Encrypted Direct Stream</span>
              </div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(6,182,212,0.12))', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1.5px solid rgba(37,99,235,0.25)', boxShadow: '0 2px 10px rgba(37,99,235,0.15)' }}>
              <ShieldLockIcon size={18} color="var(--brand)" />
            </div>
          </div>
        )}
      </div>

      {/* Free limit exceeded banner */}
      {isOverFreeLimit && (
        <div style={{
          padding: '10px 14px', borderRadius: 14, background: 'rgba(220,38,38,0.08)',
          border: '1px solid rgba(220,38,38,0.25)', marginBottom: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10
        }}>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <AlertTriangleIcon size={16} color="#dc2626" />
            <span><strong>{formatBytes(totalSize)}</strong> exceeds 10GB limit.</span>
          </div>
          <button
            onClick={onOpenUpgrade}
            className="btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.78rem', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 8 }}
          >
            <span>Upgrade to Pro</span>
            <ArrowRightIcon size={12} />
          </button>
        </div>
      )}

      {/* Screen-Fitted 3D Drop zone with Standard Upload Vector Icon */}
      {!isUploading && (
        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
          style={{
            padding: '24px 18px',
            marginBottom: 14,
            textAlign: 'center',
            minHeight: 160,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 18,
            border: '2px dashed rgba(37,99,235,0.3)',
            background: dragOver ? 'rgba(37,99,235,0.08)' : 'var(--glass-bg-subtle)',
            transition: 'all 200ms ease',
            cursor: 'pointer'
          }}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={e => e.target.files && addFiles(e.target.files)}
          />
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(37,99,235,0.15), rgba(6,182,212,0.15))',
            border: '1.5px solid rgba(37,99,235,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
            boxShadow: '0 6px 18px rgba(37,99,235,0.2)'
          }}>
            <UploadCloudIcon size={26} color="var(--brand)" />
          </div>
          <p style={{ fontSize: '0.96rem', fontWeight: 800, color: 'var(--text-1)', marginBottom: 4 }}>
            Drag & drop files here or <span style={{ color: 'var(--brand)', textDecoration: 'underline' }}>browse</span>
          </p>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', fontWeight: 600 }}>
            Up to 10GB Free · Any format · Zero sign-up required
          </span>
        </div>
      )}

      {/* Compact File list */}
      {files.length > 0 && (
        <div style={{ border: '1.5px solid var(--border-glass)', borderRadius: 16, overflow: 'hidden', marginBottom: 14, background: 'var(--glass-bg-subtle)', width: '100%', maxWidth: '100%', boxSizing: 'border-box' }}>
          <div style={{ maxHeight: 180, overflowY: 'auto' }}>
            {files.map((uf: UploadFile, idx: number) => (
              <div
                key={uf.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  borderTop: idx > 0 ? '1px solid var(--border)' : 'none',
                  background: uf.status === 'done' ? 'rgba(5,150,105,0.06)' : uf.status === 'error' ? 'rgba(220,38,38,0.06)' : 'transparent',
                  transition: 'background 200ms ease',
                  minWidth: 0,
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              >
                <HolographicProgress progress={uf.progress} status={uf.status} id={uf.id} />
                <div style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden' }}>
                  <div
                    title={uf.file.name}
                    style={{
                      fontSize: '0.86rem',
                      fontWeight: 800,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      color: 'var(--text-1)',
                      marginBottom: 2,
                      width: '100%',
                      display: 'block'
                    }}
                  >
                    {uf.file.name}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-3)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', overflow: 'hidden' }}>
                    <span style={{ whiteSpace: 'nowrap' }}>{formatBytes(uf.file.size)}</span>
                    {uf.status === 'uploading' && <span style={{ color: 'var(--brand)', fontWeight: 800, whiteSpace: 'nowrap' }}>• Uploading {uf.progress}%</span>}
                    {uf.status === 'done'      && <span style={{ color: '#059669', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' }}>• <CheckIcon size={12} color="#059669" /> Ready</span>}
                    {uf.status === 'error'     && <span style={{ color: '#dc2626', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 3, wordBreak: 'break-word' }}>• <XIcon size={12} color="#dc2626" /> {uf.error || 'Failed'}</span>}
                    {uf.status === 'pending'   && <span style={{ whiteSpace: 'nowrap' }}>• Ready to send</span>}
                  </div>
                </div>
                {!isUploading && uf.status === 'pending' && (
                  <button
                    onClick={() => removeFile(uf.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px', display: 'flex', alignItems: 'center', flexShrink: 0 }}
                  >
                    <XIcon size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ padding: '10px 14px', background: 'var(--glass-bg)', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, width: '100%', boxSizing: 'border-box' }}>
            <span style={{ fontSize: '0.82rem', color: isOverFreeLimit ? '#dc2626' : 'var(--text-2)', fontWeight: 700, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {files.length} file{files.length !== 1 ? 's' : ''} · {formatBytes(totalSize)}
              {isOverFreeLimit && ' (Limit 10GB)'}
            </span>
            {!isUploading && (
              <button
                onClick={onNext}
                className="btn-primary"
                style={{ padding: '8px 18px', fontSize: '0.84rem', fontWeight: 800, borderRadius: 10, display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0, marginLeft: 'auto', boxShadow: '0 4px 14px rgba(37,99,235,0.3)' }}
              >
                <span>{isOverFreeLimit ? 'Upgrade to Send' : 'Next: Options'}</span>
                <ArrowRightIcon size={14} />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsStep({
  files,
  totalSize,
  deliveryMode,
  setDeliveryMode,
  recipientEmails,
  setRecipientEmails,
  senderEmail,
  setSenderEmail,
  emailMessage,
  setEmailMessage,
  transferName,
  setTransferName,
  expiry,
  setExpiry,
  maxDownloads,
  setMaxDownloads,
  password,
  setPassword,
  passwordConfirm,
  setPasswordConfirm,
  error,
  creating,
  onBack,
  onCreate
}: any) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button
          onClick={onBack}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '0.86rem', fontWeight: 800, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4 }}
        >
          <ArrowLeftIcon size={14} />
          <span>Back</span>
        </button>
        <span style={{ color: 'var(--border-mid)' }}>|</span>
        <div>
          <span style={{ fontWeight: 900, fontSize: '0.98rem', color: 'var(--text-1)' }}>Transfer Options</span>
          <span style={{ fontSize: '0.76rem', color: 'var(--text-3)', marginLeft: 8, fontWeight: 600 }}>
            {files.length} file{files.length !== 1 ? 's' : ''} ({formatBytes(totalSize)})
          </span>
        </div>
      </div>

      {/* Delivery Mode Tabs */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: 4, background: 'var(--glass-bg-subtle)', borderRadius: 14, border: '1px solid var(--border)', marginBottom: 14 }}>
        <button
          type="button"
          onClick={() => setDeliveryMode('link')}
          style={{
            padding: '9px 12px',
            borderRadius: 10,
            border: 'none',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 200ms ease',
            background: deliveryMode === 'link' ? 'var(--brand)' : 'transparent',
            color: deliveryMode === 'link' ? '#ffffff' : 'var(--text-2)',
            boxShadow: deliveryMode === 'link' ? '0 4px 14px rgba(37,99,235,0.35)' : 'none'
          }}
        >
          <LinkIcon size={15} />
          <span>Get Link</span>
        </button>
        <button
          type="button"
          onClick={() => setDeliveryMode('email')}
          style={{
            padding: '9px 12px',
            borderRadius: 10,
            border: 'none',
            fontSize: '0.84rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            transition: 'all 200ms ease',
            background: deliveryMode === 'email' ? 'var(--brand)' : 'transparent',
            color: deliveryMode === 'email' ? '#ffffff' : 'var(--text-2)',
            boxShadow: deliveryMode === 'email' ? '0 4px 14px rgba(37,99,235,0.35)' : 'none'
          }}
        >
          <MailIcon size={15} />
          <span>Send Email</span>
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12, maxHeight: 360, overflowY: 'auto', paddingRight: 4, paddingBottom: 4 }}>
        {/* Email Delivery Specific Inputs */}
        {deliveryMode === 'email' && (
          <>
            <div>
              <label className="label" style={{ marginBottom: 3, fontSize: '0.78rem', fontWeight: 700 }}>Recipient email address(es)</label>
              <input
                className="input"
                style={{ padding: '9px 12px', fontSize: '0.86rem', borderRadius: 10 }}
                placeholder="colleague@gmail.com, client@company.com"
                value={recipientEmails}
                onChange={e => setRecipientEmails(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: 3, display: 'block' }}>
                Separate multiple recipients with commas
              </span>
            </div>

            <div>
              <label className="label" style={{ marginBottom: 3, fontSize: '0.78rem', fontWeight: 700 }}>Your email address</label>
              <input
                className="input"
                type="email"
                style={{ padding: '9px 12px', fontSize: '0.86rem', borderRadius: 10 }}
                placeholder="yourname@gmail.com"
                value={senderEmail}
                onChange={e => setSenderEmail(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="label" style={{ marginBottom: 3, fontSize: '0.78rem', fontWeight: 700 }}>Message (Optional)</label>
              <input
                className="input"
                style={{ padding: '9px 12px', fontSize: '0.86rem', borderRadius: 10 }}
                placeholder="Add a note for the recipients..."
                value={emailMessage}
                onChange={e => setEmailMessage(e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <label className="label" style={{ marginBottom: 3, fontSize: '0.78rem', fontWeight: 700 }}>Transfer title (Optional)</label>
          <input
            className="input"
            style={{ padding: '9px 12px', fontSize: '0.86rem', borderRadius: 10 }}
            placeholder="e.g. Q3 Design Deliverables"
            value={transferName}
            onChange={e => setTransferName(e.target.value)}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div>
            <label className="label" style={{ marginBottom: 3, fontSize: '0.78rem', fontWeight: 700 }}>Expires after</label>
            <select className="select" style={{ padding: '9px 30px 9px 12px', fontSize: '0.84rem', borderRadius: 10 }} value={expiry} onChange={e => setExpiry(e.target.value)}>
              <option value="1">1 day</option>
              <option value="3">3 days</option>
              <option value="7">7 days (Free Standard)</option>
              <option value="14">14 days</option>
              <option value="30">30 days (Pro)</option>
            </select>
          </div>
          <div>
            <label className="label" style={{ marginBottom: 3, fontSize: '0.78rem', fontWeight: 700 }}>Download limit</label>
            <select className="select" style={{ padding: '9px 30px 9px 12px', fontSize: '0.84rem', borderRadius: 10 }} value={maxDownloads} onChange={e => setMaxDownloads(e.target.value)}>
              <option value="0">Unlimited downloads</option>
              <option value="1">1 download only</option>
              <option value="5">5 downloads</option>
              <option value="10">10 downloads (Free Max)</option>
              <option value="25">25 downloads</option>
              <option value="50">50 downloads</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label" style={{ marginBottom: 3, fontSize: '0.78rem', fontWeight: 700 }}>Password protection (Optional)</label>
          <input
            className="input"
            type="password"
            style={{ padding: '9px 12px', fontSize: '0.86rem', marginBottom: password ? 6 : 0, borderRadius: 10 }}
            placeholder="Set an encryption password"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          {password && (
            <input
              className="input"
              type="password"
              style={{ padding: '9px 12px', fontSize: '0.86rem', borderRadius: 10 }}
              placeholder="Confirm password"
              value={passwordConfirm}
              onChange={e => setPasswordConfirm(e.target.value)}
            />
          )}
        </div>
      </div>

      {error && (
        <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 10, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
          <AlertTriangleIcon size={14} color="#dc2626" />
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={onCreate}
        disabled={creating}
        className="btn-primary"
        style={{ width: '100%', marginTop: 14, padding: '12px', fontSize: '0.92rem', fontWeight: 800, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 6px 20px rgba(37,99,235,0.35)' }}
      >
        {creating ? (
          <>
            <SpinnerIcon size={18} />
            <span>{deliveryMode === 'email' ? 'Uploading & Sending Email...' : 'Uploading & Generating Link...'}</span>
          </>
        ) : (
          <>
            {deliveryMode === 'email' ? (
              <>
                <MailIcon size={16} />
                <span>Upload & Send to Email(s)</span>
                <ArrowRightIcon size={14} />
              </>
            ) : (
              <>
                <ArrowUpTrayIcon size={18} />
                <span>Upload & Generate Share Link</span>
              </>
            )}
          </>
        )}
      </button>
    </div>
  )
}

function SuccessStep({ result, copied, onCopy, onReset }: any) {
  const isEmailDelivery = result.deliveryMode === 'email' && result.recipients?.length > 0

  return (
    <div style={{ textAlign: 'center', padding: '4px 0' }}>
      {/* 3D Glowing Success Badge */}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <div
          style={{
            position: 'absolute',
            width: 70,
            height: 70,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.45) 0%, rgba(6,182,212,0.2) 65%, transparent 100%)',
            filter: 'blur(12px)',
            pointerEvents: 'none'
          }}
        />
        <div
          className="check-pop"
          style={{
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #2563eb 0%, #0284c7 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(37,99,235,0.38)',
            position: 'relative',
            border: '1.5px solid rgba(255,255,255,0.3)'
          }}
        >
          <CheckCircleIcon size={28} color="white" />
        </div>
      </div>

      <h2 style={{ fontSize: '1.34rem', fontWeight: 900, marginBottom: 8, color: 'var(--text-1)', letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
        <span>{isEmailDelivery ? 'Transfer Emailed Successfully!' : 'Transfer Link Ready!'}</span>
        {isEmailDelivery && <MailIcon size={19} color="var(--brand)" />}
      </h2>

      {/* Metadata Pill Chips */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 20,
            background: 'var(--glass-bg)',
            border: '1px solid var(--border)',
            fontSize: '0.74rem',
            fontWeight: 700,
            color: 'var(--text-1)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span>📦</span>
          <span>{result.fileCount} file{result.fileCount !== 1 ? 's' : ''} ({formatBytes(result.totalSize)})</span>
        </span>
        <span
          style={{
            padding: '3px 10px',
            borderRadius: 20,
            background: 'rgba(5,150,105,0.1)',
            border: '1px solid rgba(5,150,105,0.25)',
            fontSize: '0.74rem',
            fontWeight: 700,
            color: '#059669',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4
          }}
        >
          <span>⏳</span>
          <span>Expires {new Date(result.expiresAt).toLocaleDateString()}</span>
        </span>
      </div>

      {/* Recipient Notification Box if Email Mode */}
      {isEmailDelivery && (
        <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(5,150,105,0.08)', border: '1px solid rgba(5,150,105,0.25)', marginBottom: 14, textAlign: 'left' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#059669', marginBottom: 2, display: 'flex', alignItems: 'center', gap: 4 }}>
            <CheckIcon size={14} color="#059669" />
            <span>Download invitation sent to:</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-1)', fontWeight: 600 }}>
            {result.recipients.join(', ')}
          </div>
        </div>
      )}

      {/* Premium Glass Link Input Box */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 6px 6px 12px',
          background: 'var(--glass-bg-subtle)',
          border: '1.5px solid rgba(37,99,235,0.3)',
          borderRadius: 14,
          marginBottom: 14,
          boxShadow: '0 4px 18px rgba(37,99,235,0.12)',
          transition: 'all 200ms ease'
        }}
      >
        <span style={{ fontSize: '0.85rem', flexShrink: 0, opacity: 0.8 }}>🔗</span>
        <span
          style={{
            flex: 1,
            fontSize: '0.82rem',
            fontFamily: 'monospace',
            fontWeight: 700,
            color: 'var(--brand)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'left'
          }}
        >
          {result.url}
        </span>
        <button
          onClick={onCopy}
          className="btn-primary"
          style={{
            padding: '8px 16px',
            fontSize: '0.82rem',
            fontWeight: 800,
            borderRadius: 10,
            flexShrink: 0,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            boxShadow: '0 4px 12px rgba(37,99,235,0.3)'
          }}
        >
          {copied ? (
            <>
              <CheckIcon size={14} color="white" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <LinkIcon size={14} />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>

      {/* Sleek Floating Social Share Dock */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 9,
          padding: '5px 14px',
          borderRadius: 30,
          background: 'var(--glass-bg-subtle)',
          border: '1px solid var(--border)',
          marginBottom: 14,
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)'
        }}
      >
        <span style={{ fontSize: '0.68rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: 2 }}>
          Quick Share:
        </span>

        {/* WhatsApp */}
        <a
          href={`https://api.whatsapp.com/send?text=${encodeURIComponent(`Download files on DropLync: ${result.url}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on WhatsApp"
          aria-label="Share on WhatsApp"
          className="card-hover"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(37,211,102,0.12)',
            border: '1.5px solid rgba(37,211,102,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 2px 8px rgba(37,211,102,0.15)',
            flexShrink: 0
          }}
        >
          <WhatsAppIcon size={17} color="#25d366" />
        </a>

        {/* Telegram */}
        <a
          href={`https://t.me/share/url?url=${encodeURIComponent(result.url)}&text=${encodeURIComponent('Download files via DropLync')}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on Telegram"
          aria-label="Share on Telegram"
          className="card-hover"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(0,136,204,0.12)',
            border: '1.5px solid rgba(0,136,204,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 2px 8px rgba(0,136,204,0.15)',
            flexShrink: 0
          }}
        >
          <TelegramIcon size={17} color="#0088cc" />
        </a>

        {/* 𝕏 / Twitter */}
        <a
          href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Transfer large files up to 10GB for free with @DropLync')}&url=${encodeURIComponent(result.url)}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Share on X"
          aria-label="Share on X"
          className="card-hover"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'var(--glass-bg)',
            border: '1.5px solid var(--border-mid)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            flexShrink: 0
          }}
        >
          <TwitterXIcon size={15} color="var(--text-1)" />
        </a>

        {/* Native Web Share */}
        <button
          type="button"
          onClick={() => {
            if (typeof navigator !== 'undefined' && navigator.share) {
              navigator.share({
                title: 'DropLync File Transfer',
                text: 'Download files via DropLync (10GB Free)',
                url: result.url
              }).catch(() => {})
            } else {
              onCopy()
            }
          }}
          title="Share via device menu"
          aria-label="Share via device menu"
          className="card-hover"
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'rgba(37,99,235,0.12)',
            border: '1.5px solid rgba(37,99,235,0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
            boxShadow: '0 2px 8px rgba(37,99,235,0.15)',
            flexShrink: 0
          }}
        >
          <ShareSheetIcon size={15} color="var(--brand)" />
        </button>
      </div>

      {/* Balanced Dual Actions */}
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
        <a
          href={result.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary"
          style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            padding: '8px 16px',
            borderRadius: 10,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <span>Preview Portal</span>
          <ArrowRightIcon size={13} />
        </a>
        <button
          onClick={onReset}
          className="btn-ghost"
          style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            padding: '8px 14px',
            borderRadius: 10
          }}
        >
          + Send Another Transfer
        </button>
      </div>

      {/* Ad & Sponsor Unit on Upload Success */}
      <AdBanner slotId="upload_success_banner" format="horizontal" />
    </div>
  )
}

const FEATURES = [
  { icon: <ShieldLockIcon size={22} color="var(--brand)" />, title: 'Tiered Storage Architecture', desc: '10GB free tier and up to 200GB Pro with high-performance direct offset chunking.', bg: 'rgba(37,99,235,0.12)' },
  { icon: <ClockIcon size={22} color="#0284c7" />, title: 'Auto-Expiring Cleanups', desc: 'Set links to expire after 1 to 30 days. Files and chunks are permanently purged.', bg: 'rgba(2,132,199,0.12)' },
  { icon: <LockIcon size={22} color="#059669" />, title: 'Client-Side Hashing', desc: 'Secure passwords with bcrypt hashing and rate-limited brute force protection.', bg: 'rgba(5,150,105,0.12)' },
  { icon: <BarChartIcon size={22} color="#06b6d4" />, title: 'Real-Time Telemetry', desc: 'Live upload speed indicators (MB/s), estimated time remaining, and chunk verification.', bg: 'rgba(6,182,212,0.12)' },
]

const STATS = [
  { value: '10 GB', label: 'Free Tier Transfer Limit' },
  { value: '200 GB', label: 'Pro & Ultra Tier Limit' },
  { value: '99.9%', label: 'Upload Success Reliability' },
  { value: '256-Bit', label: 'Cryptographic Protection' },
]

