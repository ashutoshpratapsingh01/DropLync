'use client'
import { useState, useEffect } from 'react'
import { formatBytes, timeUntilExpiry } from '@/lib/utils'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import Tilt3D from '@/components/ui/Tilt3D'
import Background3D from '@/components/Background3D'
import Logo from '@/components/Logo'
import {
  DownloadCloudIcon,
  ArrowDownTrayIcon,
  ShieldLockIcon,
  CheckCircleIcon,
  ArrowUpTrayIcon,
  ServerStackIcon,
  UploadCloudIcon,
  LinkIcon,
  CheckIcon,
  AlertTriangleIcon,
  SpinnerIcon,
  ArrowRightIcon,
  FileIcon,
  FileZipIcon,
  HardDriveIcon
} from '@/components/ui/Icons'

type TransferFile = { id: string; originalName: string; mimeType: string; size: string; downloadCount: number }
type TransferInfo = {
  id: string; name: string; expiresAt: string; totalSize: string
  downloadCount: number; maxDownloads: number | null; hasPassword: boolean; files: TransferFile[]
}

function RenderFileIcon({ mimeType }: { mimeType: string }) {
  if (!mimeType) return <FileIcon size={16} color="var(--brand)" />
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('tar') || mimeType.includes('rar') || mimeType.includes('7z')) {
    return <FileZipIcon size={16} color="var(--brand)" />
  }
  return <FileIcon size={16} color="var(--brand)" />
}

export default function DownloadClient({ token }: { token: string }) {
  const [info, setInfo] = useState<TransferInfo | null>(null)
  const [files, setFiles] = useState<TransferFile[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [hasStartedDownload, setHasStartedDownload] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)

  useScrollReveal([loading, unlocked, files.length, hasStartedDownload])

  useEffect(() => {
    fetch(`/api/share/${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); return }
        setInfo(data)
        if (!data.hasPassword) setFiles(data.files)
      })
      .catch(() => setError('Failed to load transfer session'))
      .finally(() => setLoading(false))
  }, [token])

  async function verifyPassword() {
    setVerifying(true); setPwError('')
    const res = await fetch(`/api/share/${token}/verify`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    const data = await res.json()
    setVerifying(false)
    if (data.error) { setPwError(data.error); return }
    setFiles(data.files); setUnlocked(true)
  }

  function downloadFile(fileId: string, filename: string) {
    setDownloading(fileId)
    setHasStartedDownload(true)
    const url = `/api/share/${token}/files/${fileId}`

    if (info?.hasPassword && unlocked) {
      streamDownload(url, filename, password).finally(() => setDownloading(null))
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => setDownloading(null), 1500)
    }
  }

  function downloadAll() {
    setDownloading('all')
    setHasStartedDownload(true)
    const url = `/api/share/${token}/download-all`
    const zipName = `${info?.name || 'transfer'}.zip`

    if (info?.hasPassword && unlocked) {
      streamDownload(url, zipName, password).finally(() => setDownloading(null))
    } else {
      const a = document.createElement('a')
      a.href = url
      a.download = zipName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => setDownloading(null), 1500)
    }
  }

  async function copyShareLink() {
    if (typeof window !== 'undefined') {
      await navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      setTimeout(() => setCopiedLink(false), 2200)
    }
  }

  async function streamDownload(url: string, filename: string, pw: string) {
    try {
      const res = await fetch(url, {
        headers: { 'x-transfer-password': pw }
      })
      if (!res.ok || !res.body) return

      const reader = res.body.getReader()
      const chunks: Uint8Array[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }

      const blob = new Blob(chunks as BlobPart[], {
        type: res.headers.get('content-type') || 'application/octet-stream'
      })
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(blobUrl)
    } catch (err) {
      console.error('Download failed:', err)
    }
  }

  if (loading) return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative' }}>
      <Background3D />
      <div className="glass-panel" style={{ padding: '32px 40px', textAlign: 'center', borderRadius: 18 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', margin: '0 auto 12px', background: 'linear-gradient(135deg, #2563eb, #0284c7)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <SpinnerIcon size={22} color="white" />
        </div>
        <p style={{ color: 'var(--text-1)', fontSize: '0.94rem', fontWeight: 800 }}>Decrypting Transfer Session...</p>
        <span style={{ color: 'var(--text-3)', fontSize: '0.76rem', marginTop: 3, display: 'block' }}>Establishing secure connection</span>
      </div>
    </div>
  )

  if (error) return (
    <div style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', position: 'relative', padding: '24px 20px' }}>
      <Background3D />
      <div style={{ width: '100%', maxWidth: 460 }}>
        <Tilt3D intensity={5}>
          <div className="glass-panel" style={{ padding: '32px 28px', textAlign: 'center', borderRadius: 20 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(220,38,38,0.12)', border: '1px solid rgba(220,38,38,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <ShieldLockIcon size={24} color="#dc2626" />
            </div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, marginBottom: 6, color: 'var(--text-1)' }}>
              {error.includes('expired') ? 'Transfer Expired' : error.includes('limit') ? 'Download Limit Reached' : error.includes('disabled') ? 'Transfer Inactive' : 'Transfer Not Found'}
            </h2>
            <p style={{ color: 'var(--text-2)', marginBottom: 20, lineHeight: 1.55, fontSize: '0.86rem' }}>{error}</p>
            <a href="/" className="btn-primary" style={{ padding: '9px 22px', fontSize: '0.86rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span>Send Your Own Files (10GB Free)</span>
              <ArrowRightIcon size={14} />
            </a>
          </div>
        </Tilt3D>
      </div>
    </div>
  )

  if (!info) return null
  const showPasswordGate = info.hasPassword && !unlocked
  const totalFiles = files.length
  const totalBytes = files.reduce((s, f) => s + parseInt(f.size || '0'), 0)

  return (
    <main style={{ position: 'relative', overflow: 'hidden' }}>
      {/* Background */}
      <Background3D />

      {/* Glowing Mesh Orbs */}
      <div className="ambient-orb-container">
        <div className="orb orb-primary" />
        <div className="orb orb-accent" />
        <div className="orb orb-indigo" />
      </div>

      {/* HERO SECTION */}
      <section className="hero-bg" style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', padding: '10px 0 16px', position: 'relative', zIndex: 1 }}>
        <div className="section-container" style={{ width: '100%' }}>
          <div className="responsive-grid-download">

            {/* Left: Copy & Value Props */}
            <div>
              <div className="reveal" style={{ marginBottom: 8 }}>
                <span className="stat-pill" style={{ padding: '4px 12px', fontSize: '0.78rem', borderColor: 'rgba(5,150,105,0.3)', background: 'rgba(5,150,105,0.08)' }}>
                  <span className="pulse-dot" style={{ background: '#059669', width: 6, height: 6 }} />
                  <span style={{ fontWeight: 800, color: '#059669', letterSpacing: '0.02em' }}>
                    Verified 256-Bit Encrypted Transfer
                  </span>
                </span>
              </div>

              <h1 className="reveal reveal-delay-1" style={{ fontSize: 'clamp(1.95rem, 3.1vw, 2.75rem)', fontWeight: 900, lineHeight: 1.12, marginBottom: 8, letterSpacing: '-0.04em', color: 'var(--text-1)' }}>
                Receive large files.<br />
                <span className="gradient-text">Fast, private & zero limits.</span>
              </h1>

              <p className="reveal reveal-delay-2" style={{ fontSize: '0.94rem', color: 'var(--text-2)', maxWidth: 450, lineHeight: 1.54, marginBottom: 14 }}>
                You have received a verified transfer. Files stream directly with zero server memory stalls. Need to share files with someone else? Upload <strong>up to 10GB free</strong> with <a href="/" style={{ color: 'var(--brand)', fontWeight: 800, textDecoration: 'underline' }}>DropLync Direct</a>.
              </p>

              {/* Feature Cards */}
              <div className="reveal reveal-delay-2 responsive-grid-2" style={{ marginBottom: 14, maxWidth: 430 }}>
                {[
                  { title: 'Direct Chunk Stream', icon: <UploadCloudIcon size={16} color="var(--brand)" /> },
                  { title: 'End-to-End Encrypted', icon: <ShieldLockIcon size={16} color="var(--brand)" /> },
                  { title: 'Auto-Purging Payload', icon: <ServerStackIcon size={16} color="var(--brand)" /> },
                  { title: 'Send 10GB Free', icon: <CheckCircleIcon size={16} color="#059669" /> }
                ].map((item, i) => (
                  <div key={i} className="card-soft card-hover" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10 }}>
                    <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-1)' }}>{item.title}</span>
                  </div>
                ))}
              </div>

              {/* Social proof avatar stack */}
              <div className="reveal reveal-delay-3" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ display: 'flex' }}>
                  {['#2563eb','#0284c7','#06b6d4','#059669','#3b82f6'].map((c, i) => (
                    <div key={i} style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: '2px solid var(--bg)', marginLeft: i > 0 ? -9 : 0, boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }} />
                  ))}
                </div>
                <div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-1)', fontWeight: 800 }}>Over 50,000+ files delivered</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>10GB Free Tier · High-speed multi-part retrieval</div>
                </div>
              </div>
            </div>

            {/* Right: Widget */}
            <div className="reveal reveal-delay-2" style={{ width: '100%', maxWidth: '100%', minWidth: 0 }}>
              <Tilt3D intensity={6} glare={true} className="glass-panel" style={{ padding: '20px 16px', borderRadius: 24, width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                
                {/* Header */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontSize: '1.08rem', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.02em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {info.name || 'Shared Transfer'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: 1 }}>
                        {formatBytes(parseInt(info.totalSize || '0'))} · Expires in {timeUntilExpiry(info.expiresAt)}
                      </div>
                    </div>
                    <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(5,150,105,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(5,150,105,0.25)', flexShrink: 0 }}>
                      <DownloadCloudIcon size={17} color="#059669" />
                    </div>
                  </div>
                </div>

                {/* Password Decryption Gate */}
                {showPasswordGate && (
                  <div style={{ padding: '20px 16px', textAlign: 'center', background: 'var(--glass-bg-subtle)', borderRadius: 14, border: '1px solid var(--border)' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, margin: '0 auto 8px', background: 'rgba(37,99,235,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(37,99,235,0.25)' }}>
                      <ShieldLockIcon size={18} color="var(--brand)" />
                    </div>
                    <h2 style={{ fontSize: '1rem', fontWeight: 900, marginBottom: 2, color: 'var(--text-1)' }}>
                      Enter Decryption Password
                    </h2>
                    <p style={{ color: 'var(--text-3)', marginBottom: 12, fontSize: '0.78rem' }}>
                      This transfer is secured with password encryption.
                    </p>
                    <div style={{ maxWidth: 280, margin: '0 auto' }}>
                      <input
                        type="password"
                        className="input"
                        placeholder="Enter password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && verifyPassword()}
                        style={{ marginBottom: 8, textAlign: 'center', padding: '8px 12px', fontSize: '0.84rem' }}
                      />
                      {pwError && (
                        <div style={{ color: '#dc2626', fontSize: '0.76rem', marginBottom: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                          <AlertTriangleIcon size={14} color="#dc2626" />
                          <span>{pwError}</span>
                        </div>
                      )}
                      <button
                        onClick={verifyPassword}
                        disabled={verifying || !password}
                        className="btn-primary"
                        style={{ width: '100%', padding: '8px', fontSize: '0.84rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                      >
                        {verifying ? (
                          <>
                            <SpinnerIcon size={16} />
                            <span>Decrypting...</span>
                          </>
                        ) : (
                          <>
                            <span>Unlock Files</span>
                            <ArrowRightIcon size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Unlocked Files List & Interactive Action Controls */}
                {!showPasswordGate && (
                  <div>
                    {/* Post-Download Interactive Action Suite */}
                    {hasStartedDownload ? (
                      <div style={{
                        padding: '12px 14px',
                        borderRadius: 14,
                        background: 'linear-gradient(135deg, rgba(37,99,235,0.12), rgba(6,182,212,0.12))',
                        border: '1.5px solid rgba(37,99,235,0.3)',
                        marginBottom: 10,
                        boxShadow: '0 4px 14px rgba(37,99,235,0.15)',
                        textAlign: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 2 }}>
                          <CheckCircleIcon size={16} color="#059669" />
                          <span style={{ fontWeight: 900, fontSize: '0.88rem', color: 'var(--text-1)' }}>
                            Download in progress!
                          </span>
                        </div>
                        <p style={{ color: 'var(--text-2)', fontSize: '0.74rem', marginBottom: 10 }}>
                          Enjoy high line-speed delivery. Want to send your own files?
                        </p>

                        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                          <a
                            href="/"
                            className="btn-primary"
                            style={{ padding: '7px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5, flex: '1 1 auto', justifyContent: 'center' }}
                          >
                            <ArrowUpTrayIcon size={13} />
                            <span>Send Files (10GB Free)</span>
                            <ArrowRightIcon size={12} />
                          </a>
                          <button
                            onClick={copyShareLink}
                            className="btn-secondary"
                            style={{ padding: '7px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 5, flex: '1 1 auto', justifyContent: 'center' }}
                          >
                            {copiedLink ? (
                              <>
                                <CheckIcon size={13} color="#059669" />
                                <span>Copied!</span>
                              </>
                            ) : (
                              <>
                                <LinkIcon size={13} />
                                <span>Copy Link</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={downloadAll}
                            disabled={!!downloading}
                            className="btn-ghost"
                            style={{ fontSize: '0.76rem', padding: '7px 8px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                          >
                            <SpinnerIcon size={12} className={downloading === 'all' ? 'spin' : ''} />
                            <span>Again</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Primary Download All Bar */
                      <div style={{ marginBottom: 10, textAlign: 'center' }}>
                        <button
                          onClick={downloadAll}
                          disabled={!!downloading}
                          className="btn-primary"
                          style={{
                            width: '100%',
                            padding: '12px 20px',
                            fontSize: '0.94rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            boxShadow: '0 6px 18px rgba(37,99,235,0.28)'
                          }}
                        >
                          {downloading === 'all' ? (
                            <>
                              <SpinnerIcon size={17} color="white" />
                              <span>Preparing Stream Archive...</span>
                            </>
                          ) : (
                            <>
                              <DownloadCloudIcon size={17} color="white" />
                              <span>Download All Files ({totalFiles}) · {formatBytes(totalBytes || parseInt(info.totalSize || '0'))}</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}

                    {/* Compact File list items */}
                    <div style={{ border: '1px solid var(--border-glass)', borderRadius: 12, overflow: 'hidden', background: 'var(--glass-bg-subtle)', width: '100%', boxSizing: 'border-box' }}>
                      <div style={{ padding: '7px 12px', background: 'var(--glass-bg)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                          Files in Transfer ({totalFiles})
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>
                          Direct Offset Stream
                        </span>
                      </div>

                      <div style={{ maxHeight: 150, overflowY: 'auto' }}>
                        {files.map((file, i) => (
                          <div
                            key={file.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              gap: 8,
                              padding: '8px 12px',
                              borderBottom: i < files.length - 1 ? '1px solid var(--border)' : 'none',
                              transition: 'background 150ms ease',
                              width: '100%',
                              boxSizing: 'border-box',
                              minWidth: 0
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.04)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 0%', overflow: 'hidden' }}>
                              <div style={{ width: 28, height: 28, borderRadius: 6, background: 'var(--glass-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', flexShrink: 0 }}>
                                <RenderFileIcon mimeType={file.mimeType} />
                              </div>
                              <div style={{ flex: '1 1 0%', minWidth: 0, overflow: 'hidden' }}>
                                <div title={file.originalName} style={{ fontWeight: 800, fontSize: '0.82rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1, width: '100%', display: 'block' }}>
                                  {file.originalName}
                                </div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>
                                  {formatBytes(parseInt(file.size))}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => downloadFile(file.id, file.originalName)}
                              disabled={!!downloading}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.74rem', display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0 }}
                            >
                              {downloading === file.id ? <SpinnerIcon size={12} /> : <><ArrowDownTrayIcon size={11} /> <span>Download</span></>}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Referral Strip */}
                    <div style={{
                      marginTop: 10,
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: 'var(--glass-bg-subtle)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: 6,
                      width: '100%',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <UploadCloudIcon size={14} color="var(--brand)" />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-2)', fontWeight: 600 }}>
                          Send files up to <strong>10GB Free</strong> with DropLync.
                        </span>
                      </div>
                      <a
                        href="/"
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 800,
                          color: 'var(--brand)',
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 3,
                          flexShrink: 0
                        }}
                      >
                        <span>Start Transfer</span>
                        <ArrowRightIcon size={12} />
                      </a>
                    </div>
                  </div>
                )}

              </Tilt3D>
            </div>

          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: '1px solid var(--border)', padding: '12px 0', background: 'var(--glass-bg-subtle)', backdropFilter: 'blur(16px)', position: 'relative', zIndex: 1 }}>
        <div className="section-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <Logo height={22} />
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
    </main>
  )
}
