'use client'
import { useState } from 'react'
import { formatBytes, formatDate, timeUntilExpiry } from '@/lib/utils'
import {
  XIcon,
  LinkIcon,
  CheckIcon,
  WhatsAppIcon,
  TelegramIcon,
  TwitterXIcon,
  QrCodeIcon,
  LockIcon,
  FolderIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ZapIcon
} from '@/components/ui/Icons'

type Transfer = {
  id: string
  token: string
  name: string | null
  expiresAt: Date | string
  isActive: boolean
  downloadCount: number
  maxDownloads: number | null
  totalSize: string
  createdAt: Date | string
  hasPassword?: boolean
  files: { id: string; size: string; mimeType?: string; originalName?: string }[]
}

// ----------------------------------------------------
// 1. SHARE MODAL
// ----------------------------------------------------
export function ShareModal({
  transfer,
  isOpen,
  onClose
}: {
  transfer: Transfer | null
  isOpen: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  if (!isOpen || !transfer) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://droplync.in'
  const shareUrl = `${origin}/f/${transfer.token}`
  const shareTitle = transfer.name || 'Encrypted File Transfer'
  const shareMessage = `Download "${shareTitle}" securely via DropLync (expires in ${timeUntilExpiry(transfer.expiresAt)}): ${shareUrl}`

  async function handleCopy() {
    await navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function openShare(type: 'whatsapp' | 'telegram' | 'twitter' | 'email') {
    if (type === 'whatsapp') {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`, '_blank')
    } else if (type === 'telegram') {
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, '_blank')
    } else if (type === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`, '_blank')
    } else if (type === 'email') {
      window.location.href = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(shareMessage)}`
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 480,
          background: 'var(--bg-soft)',
          border: '1px solid var(--border-glow)',
          borderRadius: 20,
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-1)' }}>
              Share Transfer
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
              Instant distribution channels for {transfer.name || 'Untitled'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}
          >
            <XIcon size={20} />
          </button>
        </div>

        {/* Link box */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-2)', marginBottom: 6 }}>
            DIRECT DOWNLOAD LINK
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--glass-bg)',
              border: '1px solid var(--border)',
              borderRadius: 12,
              padding: '6px 8px 6px 14px',
              gap: 10
            }}
          >
            <input
              type="text"
              readOnly
              value={shareUrl}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-1)',
                fontSize: '0.86rem',
                flex: 1,
                outline: 'none'
              }}
            />
            <button
              onClick={handleCopy}
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {copied ? <CheckIcon size={15} color="#fff" /> : <LinkIcon size={15} />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Social channels */}
        <div>
          <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: 800, color: 'var(--text-2)', marginBottom: 10 }}>
            INSTANT SOCIAL DISPATCH
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            <button
              onClick={() => openShare('whatsapp')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 10px',
                borderRadius: 14,
                border: '1px solid rgba(37,211,102,0.3)',
                background: 'rgba(37,211,102,0.1)',
                color: '#25d366',
                cursor: 'pointer',
                transition: 'transform 150ms ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1.0)')}
            >
              <WhatsAppIcon size={24} color="#25d366" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>WhatsApp</span>
            </button>

            <button
              onClick={() => openShare('telegram')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 10px',
                borderRadius: 14,
                border: '1px solid rgba(0,136,204,0.3)',
                background: 'rgba(0,136,204,0.1)',
                color: '#0088cc',
                cursor: 'pointer',
                transition: 'transform 150ms ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1.0)')}
            >
              <TelegramIcon size={24} color="#0088cc" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Telegram</span>
            </button>

            <button
              onClick={() => openShare('twitter')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 10px',
                borderRadius: 14,
                border: '1px solid var(--border)',
                background: 'var(--glass-bg)',
                color: 'var(--text-1)',
                cursor: 'pointer',
                transition: 'transform 150ms ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1.0)')}
            >
              <TwitterXIcon size={22} color="var(--text-1)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>𝕏 Post</span>
            </button>

            <button
              onClick={() => openShare('email')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                padding: '14px 10px',
                borderRadius: 14,
                border: '1px solid rgba(37,99,235,0.3)',
                background: 'rgba(37,99,235,0.1)',
                color: 'var(--brand)',
                cursor: 'pointer',
                transition: 'transform 150ms ease'
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.04)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1.0)')}
            >
              <LinkIcon size={22} color="var(--brand)" />
              <span style={{ fontSize: '0.75rem', fontWeight: 800 }}>Email</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// 2. QR CODE MODAL
// ----------------------------------------------------
export function QrCodeModal({
  transfer,
  isOpen,
  onClose
}: {
  transfer: Transfer | null
  isOpen: boolean
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  if (!isOpen || !transfer) return null

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://droplync.in'
  const shareUrl = `${origin}/f/${transfer.token}`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 380,
          background: 'var(--bg-soft)',
          border: '1px solid var(--border-glow)',
          borderRadius: 20,
          padding: '24px',
          textAlign: 'center',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text-1)' }}>
            Instant QR Scanner
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <XIcon size={20} />
          </button>
        </div>

        {/* QR Display */}
        <div
          style={{
            background: '#ffffff',
            padding: 16,
            borderRadius: 16,
            display: 'inline-block',
            margin: '0 auto 16px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)'
          }}
        >
          <img
            src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(shareUrl)}`}
            alt="Transfer QR Code"
            width={180}
            height={180}
            style={{ display: 'block', borderRadius: 8 }}
          />
        </div>

        <p style={{ fontSize: '0.84rem', color: 'var(--text-2)', marginBottom: 16 }}>
          Scan with iOS Camera or Android Scanner to download immediately on mobile.
        </p>

        <button
          onClick={async () => {
            await navigator.clipboard.writeText(shareUrl)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className="btn-primary"
          style={{ width: '100%', padding: '10px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          {copied ? <CheckIcon size={16} color="#fff" /> : <LinkIcon size={16} />}
          <span>{copied ? 'Link Copied to Clipboard!' : 'Copy Link'}</span>
        </button>
      </div>
    </div>
  )
}

// ----------------------------------------------------
// 3. TRANSFER DETAILS & FILE MANIFEST MODAL
// ----------------------------------------------------
export function TransferDetailsModal({
  transfer,
  isOpen,
  onClose,
  onExtend,
  onToggle
}: {
  transfer: Transfer | null
  isOpen: boolean
  onClose: () => void
  onExtend: (id: string) => Promise<void>
  onToggle: (id: string, isActive: boolean) => Promise<void>
}) {
  const [loading, setLoading] = useState(false)
  if (!isOpen || !transfer) return null

  const isExpired = new Date(transfer.expiresAt) <= new Date()
  const status = !transfer.isActive ? 'disabled' : isExpired ? 'expired' : 'active'
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://droplync.in'
  const shareUrl = `${origin}/f/${transfer.token}`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: 580,
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-soft)',
          border: '1px solid var(--border-glow)',
          borderRadius: 20,
          padding: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'rgba(37,99,235,0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FolderIcon size={20} color="var(--brand)" />
            </div>
            <div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{transfer.name || 'Untitled Transfer'}</span>
                {transfer.hasPassword && <LockIcon size={15} color="var(--brand)" />}
              </h3>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>
                Token: <code style={{ color: 'var(--brand)', fontWeight: 800 }}>{transfer.token}</code>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer' }}>
            <XIcon size={20} />
          </button>
        </div>

        {/* Quick Meta Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 10,
            marginBottom: 20,
            background: 'var(--glass-bg)',
            padding: 12,
            borderRadius: 14,
            border: '1px solid var(--border)'
          }}
        >
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>SIZE</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-1)' }}>
              {formatBytes(parseInt(transfer.totalSize || '0'))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>DOWNLOADS</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 900, color: 'var(--text-1)' }}>
              {transfer.downloadCount}{transfer.maxDownloads ? `/${transfer.maxDownloads}` : ''}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>STATUS</div>
            <span className={`badge badge-${status}`} style={{ padding: '2px 8px', fontSize: '0.68rem' }}>
              {status.toUpperCase()}
            </span>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', fontWeight: 700 }}>EXPIRATION</div>
            <div style={{ fontSize: '0.84rem', fontWeight: 800, color: 'var(--text-1)' }}>
              {timeUntilExpiry(transfer.expiresAt)}
            </div>
          </div>
        </div>

        {/* File Manifest List */}
        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 20 }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--text-2)', marginBottom: 8 }}>
            INCLUDED FILES ({transfer.files.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {transfer.files.map((file, idx) => (
              <div
                key={file.id || idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'var(--glass-bg-subtle)',
                  border: '1px solid var(--border)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <FolderIcon size={16} color="var(--brand)" />
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {file.originalName || `File #${idx + 1}`}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 700 }}>
                    {formatBytes(parseInt(file.size || '0'))}
                  </span>
                  <a
                    href={`/api/share/${transfer.token}/files/${file.id}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      padding: '4px 8px',
                      borderRadius: 6,
                      background: 'rgba(37,99,235,0.12)',
                      color: 'var(--brand)',
                      fontSize: '0.74rem',
                      fontWeight: 800,
                      textDecoration: 'none'
                    }}
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={async () => {
                setLoading(true)
                await onExtend(transfer.id)
                setLoading(false)
              }}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <ZapIcon size={14} color="var(--brand)" />
              <span>+7 Days Validity</span>
            </button>
            <button
              onClick={async () => {
                setLoading(true)
                await onToggle(transfer.id, transfer.isActive)
                setLoading(false)
              }}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: '8px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              {transfer.isActive ? <EyeOffIcon size={14} /> : <EyeIcon size={14} />}
              <span>{transfer.isActive ? 'Pause' : 'Activate'}</span>
            </button>
          </div>

          <a
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
            style={{ padding: '8px 18px', fontSize: '0.82rem', textDecoration: 'none' }}
          >
            Open Download Page ↗
          </a>
        </div>
      </div>
    </div>
  )
}
