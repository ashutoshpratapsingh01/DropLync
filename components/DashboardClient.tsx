'use client'
import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { formatBytes, formatDate, timeUntilExpiry } from '@/lib/utils'
import Tilt3D from '@/components/ui/Tilt3D'
import UpgradeModal from '@/components/ui/UpgradeModal'
import DashboardCharts from '@/components/DashboardCharts'
import {
  ShareModal,
  QrCodeModal,
  TransferDetailsModal
} from '@/components/DashboardModals'
import {
  DiamondIcon,
  HardDriveIcon,
  ZapIcon,
  ArrowDownTrayIcon,
  ArrowRightIcon,
  LockIcon,
  LinkIcon,
  CheckIcon,
  EyeIcon,
  EyeOffIcon,
  TrashIcon,
  FolderIcon,
  XIcon,
  SpinnerIcon,
  ShareSheetIcon,
  QrCodeIcon,
  RefreshCwIcon,
  FilterIcon
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

type Stats = {
  total: number
  active: number
  expired: number
  totalDownloads: number
  totalStorage: string
}

export default function DashboardClient({
  user: initialUser,
  transfers: initialTransfers,
  stats: initialStats
}: {
  user: { name?: string | null; email: string; plan?: string }
  transfers: Transfer[]
  stats: Stats
}) {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState(initialUser)
  const [transfers, setTransfers] = useState<Transfer[]>(initialTransfers || [])
  const [copied, setCopied] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)

  // Modals state
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [activeShareTransfer, setActiveShareTransfer] = useState<Transfer | null>(null)
  const [activeQrTransfer, setActiveQrTransfer] = useState<Transfer | null>(null)
  const [activeDetailsTransfer, setActiveDetailsTransfer] = useState<Transfer | null>(null)

  // Filtering & Sorting
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'disabled'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'size' | 'downloads'>('newest')

  // Payment banner
  const [verifyingPayment, setVerifyingPayment] = useState(false)
  const [paymentNotice, setPaymentNotice] = useState<string | null>(null)

  // Sync state if initialUser or initialTransfers change & merge with localStorage
  useEffect(() => {
    if (initialUser) setCurrentUser(initialUser)

    try {
      const localTransfers: Transfer[] = JSON.parse(localStorage.getItem('droplync_user_transfers') || '[]')
      const mergedMap = new Map<string, Transfer>()

      // Add server transfers first
      ;(initialTransfers || []).forEach(t => mergedMap.set(t.id, t))

      // Merge local transfers
      localTransfers.forEach(lt => {
        if (!mergedMap.has(lt.id)) {
          mergedMap.set(lt.id, lt)
        }
      })

      const combined = Array.from(mergedMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      setTransfers(combined)

      // Sync any missing transfers to server in background
      if (localTransfers.length > 0) {
        fetch('/api/transfers/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transfers: localTransfers })
        }).catch(err => console.warn('Background sync error:', err))
      }
    } catch (e) {
      if (initialTransfers) setTransfers(initialTransfers)
    }
  }, [initialUser, initialTransfers])

  // Payment Verification Polling
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const paymentStatus = params.get('payment')

    if (paymentStatus === 'success') {
      setVerifyingPayment(true)
      let attempts = 0

      const interval = setInterval(async () => {
        attempts++
        try {
          const res = await fetch('/api/user/subscription')
          const json = await res.json()
          if (json.success && json.data?.plan && json.data.plan !== 'free') {
            clearInterval(interval)
            setVerifyingPayment(false)
            setCurrentUser(prev => ({ ...prev, plan: json.data.plan }))
            setPaymentNotice(`Payment verified! Your subscription has been upgraded to the ${json.data.plan.toUpperCase()} tier.`)
            window.history.replaceState({}, '', '/dashboard')
            return
          }
        } catch {}

        if (attempts >= 6) {
          clearInterval(interval)
          setVerifyingPayment(false)
          setPaymentNotice('Payment session completed. Webhook confirmation is processing in the background.')
          window.history.replaceState({}, '', '/dashboard')
        }
      }, 2000)

      return () => clearInterval(interval)
    } else if (paymentStatus === 'cancelled') {
      setPaymentNotice('Stripe Checkout was cancelled. No changes were made.')
      window.history.replaceState({}, '', '/dashboard')
    }
  }, [])

  // Manual refresh/sync
  async function refreshTransfers() {
    setSyncing(true)
    try {
      const res = await fetch('/api/transfers')
      if (res.ok) {
        const data = await res.json()
        const serverList = data.data?.transfers || data.transfers || []
        const localTransfers: Transfer[] = JSON.parse(localStorage.getItem('droplync_user_transfers') || '[]')
        const mergedMap = new Map<string, Transfer>()

        serverList.forEach((t: any) => mergedMap.set(t.id, t))
        localTransfers.forEach(lt => {
          if (!mergedMap.has(lt.id)) mergedMap.set(lt.id, lt)
        })

        const combined = Array.from(mergedMap.values()).sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        setTransfers(combined)
      }
    } catch (e) {
      console.error('Refresh error:', e)
    } finally {
      setSyncing(false)
    }
  }

  async function copyLink(token: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://droplync.in'
    await navigator.clipboard.writeText(`${origin}/f/${token}`)
    setCopied(token)
    setTimeout(() => setCopied(null), 2000)
  }

  async function toggleTransfer(id: string, isActive: boolean) {
    setActionLoading(id)
    try {
      await fetch(`/api/transfers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: isActive ? 'disable' : 'enable' })
      })
      setTransfers(prev =>
        prev.map(t => (t.id === id ? { ...t, isActive: !isActive } : t))
      )
      // Update local storage
      try {
        const local = JSON.parse(localStorage.getItem('droplync_user_transfers') || '[]')
        const updated = local.map((t: any) => (t.id === id ? { ...t, isActive: !isActive } : t))
        localStorage.setItem('droplync_user_transfers', JSON.stringify(updated))
      } catch {}
    } catch (e) {
      console.error('Toggle transfer error:', e)
    }
    setActionLoading(null)
  }

  async function deleteTransfer(id: string) {
    if (!confirm('Are you sure you want to permanently delete this transfer? All files will be erased.')) return
    setActionLoading(id)
    try {
      await fetch(`/api/transfers/${id}`, { method: 'DELETE' })
      setTransfers(prev => prev.filter(t => t.id !== id))
      // Update local storage
      try {
        const local = JSON.parse(localStorage.getItem('droplync_user_transfers') || '[]')
        const updated = local.filter((t: any) => t.id !== id)
        localStorage.setItem('droplync_user_transfers', JSON.stringify(updated))
      } catch {}
    } catch (e) {
      console.error('Delete transfer error:', e)
    }
    setActionLoading(null)
  }

  async function extendTransfer(id: string) {
    setActionLoading(id)
    try {
      const res = await fetch(`/api/transfers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extend', days: 7 })
      })
      if (res.ok) {
        const data = await res.json()
        const newExpiry = data?.data?.expiresAt || data?.expiresAt || new Date(Date.now() + 7 * 86400000).toISOString()
        setTransfers(prev =>
          prev.map(t => (t.id === id ? { ...t, expiresAt: newExpiry, isActive: true } : t))
        )
        // Update local storage
        try {
          const local = JSON.parse(localStorage.getItem('droplync_user_transfers') || '[]')
          const updated = local.map((t: any) => (t.id === id ? { ...t, expiresAt: newExpiry, isActive: true } : t))
          localStorage.setItem('droplync_user_transfers', JSON.stringify(updated))
        } catch {}
      }
    } catch (e) {
      console.error('Extend transfer error:', e)
    }
    setActionLoading(null)
  }

  // Dynamic statistics calculations
  const dynamicStats = useMemo(() => {
    const now = new Date()
    let active = 0
    let expired = 0
    let totalDownloads = 0
    let totalStorageBytes = 0

    transfers.forEach(t => {
      const exp = new Date(t.expiresAt)
      const size = parseInt(t.totalSize || '0') || 0
      totalStorageBytes += size
      totalDownloads += t.downloadCount || 0

      if (t.isActive && exp > now) {
        active++
      } else {
        expired++
      }
    })

    return {
      total: transfers.length,
      active,
      expired,
      totalDownloads,
      totalStorageBytes,
      totalStorageStr: String(totalStorageBytes)
    }
  }, [transfers])

  // Filtered and Sorted Transfers
  const filteredTransfers = useMemo(() => {
    const now = new Date()
    return transfers
      .filter(t => {
        const isExp = new Date(t.expiresAt) <= now
        if (statusFilter === 'active' && (!t.isActive || isExp)) return false
        if (statusFilter === 'expired' && !isExp) return false
        if (statusFilter === 'disabled' && t.isActive) return false

        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim()
          const matchesName = (t.name || '').toLowerCase().includes(query)
          const matchesToken = (t.token || '').toLowerCase().includes(query)
          const matchesFiles = t.files.some(f => (f.originalName || '').toLowerCase().includes(query))
          return matchesName || matchesToken || matchesFiles
        }
        return true
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        if (sortBy === 'size') return parseInt(b.totalSize || '0') - parseInt(a.totalSize || '0')
        if (sortBy === 'downloads') return (b.downloadCount || 0) - (a.downloadCount || 0)
        return 0
      })
  }, [transfers, statusFilter, searchQuery, sortBy])

  if (!currentUser) {
    return (
      <div style={{ background: 'var(--bg-soft)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <SpinnerIcon size={32} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-3)', fontWeight: 600 }}>Loading your dashboard...</span>
      </div>
    )
  }

  const displayName = currentUser.name || currentUser.email.split('@')[0]
  const currentPlan = currentUser.plan || 'free'
  const planLimitDisplay = currentPlan === 'pro' ? '50 GB' : currentPlan === 'ultra' ? '200 GB' : currentPlan === 'enterprise' ? '1 TB+' : '10 GB'
  const planMaxBytes = currentPlan === 'pro' ? 50 * 1024 * 1024 * 1024 : currentPlan === 'ultra' ? 200 * 1024 * 1024 * 1024 : 10 * 1024 * 1024 * 1024
  const storagePercent = Math.min(100, Math.round((dynamicStats.totalStorageBytes / planMaxBytes) * 100)) || 0

  const STAT_CARDS = [
    { label: 'Active Plan Tier', value: currentPlan === 'free' ? '10GB Free' : currentPlan === 'pro' ? '50GB Pro' : '200GB Ultra', icon: <DiamondIcon size={20} color="var(--brand)" />, color: 'rgba(37,99,235,0.12)' },
    { label: 'Total Transfers', value: dynamicStats.total, icon: <HardDriveIcon size={20} color="#0284c7" />, color: 'rgba(2,132,199,0.12)' },
    { label: 'Active Shares', value: dynamicStats.active, icon: <ZapIcon size={20} color="#059669" />, color: 'rgba(5,150,105,0.12)' },
    { label: 'Total Downloads', value: dynamicStats.totalDownloads, icon: <ArrowDownTrayIcon size={20} color="#06b6d4" />, color: 'rgba(6,182,212,0.12)' },
  ]

  return (
    <div style={{ background: 'var(--bg-soft)', minHeight: '100vh', position: 'relative' }}>
      {/* Page header */}
      <div style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(24px)', borderBottom: '1px solid var(--border)', padding: '20px 0' }}>
        <div className="section-container">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>
                  Welcome back, {displayName}
                </h1>
                <span style={{
                  padding: '3px 10px', borderRadius: 999,
                  background: currentPlan === 'free' ? 'rgba(14, 165, 233, 0.15)' : 'rgba(37, 99, 235, 0.15)',
                  border: '1px solid var(--border-glow)',
                  color: 'var(--brand)', fontSize: '0.74rem', fontWeight: 800
                }}>
                  {currentPlan.toUpperCase()} TIER ({planLimitDisplay})
                </span>
              </div>
              <p style={{ color: 'var(--text-2)', fontSize: '0.88rem' }}>
                Real-time tracking, live analytics telemetry, and instant distribution controls
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button
                onClick={refreshTransfers}
                disabled={syncing}
                title="Sync and refresh transfers"
                className="btn-secondary"
                style={{ padding: '8px 12px', fontSize: '0.84rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                <RefreshCwIcon size={15} className={syncing ? 'animate-spin' : ''} />
                <span>{syncing ? 'Syncing...' : 'Sync'}</span>
              </button>
              {currentPlan === 'free' && (
                <button
                  onClick={() => setUpgradeOpen(true)}
                  className="btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.84rem', borderColor: 'var(--brand)', color: 'var(--brand)', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <ZapIcon size={15} color="var(--brand)" />
                  <span>Upgrade Plan</span>
                </button>
              )}
              <a href="/" className="btn-primary" style={{ padding: '8px 18px', fontSize: '0.84rem' }}>
                + New Transfer
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="section-container" style={{ padding: '24px 28px 60px' }}>

        {/* Verification / Notice Banner */}
        {verifyingPayment && (
          <div style={{
            padding: '14px 20px',
            borderRadius: 14,
            background: 'rgba(37, 99, 235, 0.12)',
            border: '1px solid rgba(37, 99, 235, 0.3)',
            color: '#60a5fa',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            fontWeight: 700,
            fontSize: '0.9rem'
          }}>
            <SpinnerIcon size={18} color="#60a5fa" />
            <span>Verifying subscription status with Stripe webhook...</span>
          </div>
        )}

        {paymentNotice && !verifyingPayment && (
          <div style={{
            padding: '14px 20px',
            borderRadius: 14,
            background: 'rgba(5, 150, 105, 0.12)',
            border: '1px solid rgba(5, 150, 105, 0.3)',
            color: '#34d399',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontWeight: 700,
            fontSize: '0.9rem'
          }}>
            <span>{paymentNotice}</span>
            <button
              onClick={() => setPaymentNotice(null)}
              style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              <XIcon size={16} />
            </button>
          </div>
        )}

        {/* Storage Quota Alert Banner */}
        <div className="glass-panel" style={{ padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flex: 1, minWidth: 260 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: storagePercent > 80 ? '#dc2626' : 'var(--brand)', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 800, marginBottom: 6 }}>
                <span style={{ color: 'var(--text-1)' }}>Storage Bandwidth: {formatBytes(dynamicStats.totalStorageBytes)} of {planLimitDisplay}</span>
                <span style={{ color: 'var(--text-3)' }}>{storagePercent}% used</span>
              </div>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${storagePercent}%` }} />
              </div>
            </div>
          </div>
          {currentPlan === 'free' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>Need higher transmission caps?</span>
              <button onClick={() => setUpgradeOpen(true)} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                <span>Unlock Pro</span>
                <ArrowRightIcon size={14} />
              </button>
            </div>
          )}
        </div>

        {/* 3D Compact Stats Cards */}
        <div className="responsive-stats-grid" style={{ marginBottom: 24 }}>
          {STAT_CARDS.map((card, i) => (
            <Tilt3D key={i} intensity={5}>
              <div className="card card-hover" style={{ padding: '14px 14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid var(--border)' }}>
                  {card.icon}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--text-1)', lineHeight: 1, letterSpacing: '-0.03em' }}>{card.value}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-3)', marginTop: 4, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{card.label}</div>
                </div>
              </div>
            </Tilt3D>
          ))}
        </div>

        {/* Interactive Analytics & Graphs Component */}
        <DashboardCharts
          transfers={transfers}
          userPlan={currentPlan}
          totalStorageBytes={dynamicStats.totalStorageBytes}
        />

        {/* Search, Filter & Controls Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16
          }}
        >
          {/* Status Tabs */}
          <div style={{ display: 'flex', background: 'var(--glass-bg)', padding: '3px', borderRadius: 12, border: '1px solid var(--border)' }}>
            {[
              { id: 'all', label: `All (${transfers.length})` },
              { id: 'active', label: `Active (${dynamicStats.active})` },
              { id: 'expired', label: `Expired (${dynamicStats.expired})` }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 9,
                  border: 'none',
                  background: statusFilter === tab.id ? 'var(--brand)' : 'transparent',
                  color: statusFilter === tab.id ? '#fff' : 'var(--text-2)',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                  transition: 'all 150ms ease'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box & Sort */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, justifyContent: 'flex-end', minWidth: 260 }}>
            <div style={{ position: 'relative', flex: 1, maxWidth: 300 }}>
              <input
                type="text"
                placeholder="Search transfers or files..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 14px',
                  borderRadius: 10,
                  border: '1px solid var(--border)',
                  background: 'var(--glass-bg)',
                  color: 'var(--text-1)',
                  fontSize: '0.82rem',
                  outline: 'none'
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: 8,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-3)',
                    cursor: 'pointer'
                  }}
                >
                  <XIcon size={14} />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              style={{
                padding: '8px 12px',
                borderRadius: 10,
                border: '1px solid var(--border)',
                background: 'var(--glass-bg)',
                color: 'var(--text-1)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="size">Largest Size</option>
              <option value="downloads">Most Downloads</option>
            </select>
          </div>
        </div>

        {/* Transfers List */}
        {filteredTransfers.length === 0 ? (
          <div className="glass-panel" style={{ padding: '48px 32px', textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(37,99,235,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', border: '1px solid rgba(37,99,235,0.2)' }}>
              <FolderIcon size={28} color="var(--brand)" />
            </div>
            <h3 style={{ fontWeight: 900, fontSize: '1.15rem', marginBottom: 6, color: 'var(--text-1)' }}>
              {searchQuery ? 'No matching transfers found' : 'No transfers recorded yet'}
            </h3>
            <p style={{ color: 'var(--text-2)', marginBottom: 20, fontSize: '0.88rem' }}>
              {searchQuery ? 'Try modifying your search term or filter parameters.' : `Upload files to start sharing instant encrypted links up to ${planLimitDisplay}.`}
            </p>
            <a href="/" className="btn-primary" style={{ padding: '10px 24px', fontSize: '0.88rem' }}>Send Your First File</a>
          </div>
        ) : (
          <div className="glass-panel table-responsive-wrapper" style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 700 }}>
              {/* Table header */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 110px 110px 240px', gap: 12, padding: '12px 18px', background: 'var(--glass-bg-subtle)', borderBottom: '1px solid var(--border)' }}>
                {['Transfer Name', 'Size', 'Status', 'Instant Actions'].map((h, i) => (
                  <div key={i} style={{ fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: i === 3 ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>

              {filteredTransfers.map((t, i) => {
                const isExpired = new Date(t.expiresAt) <= new Date()
                const status = !t.isActive ? 'disabled' : isExpired ? 'expired' : 'active'
                const isLoading = actionLoading === t.id

                return (
                  <div
                    key={t.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1.2fr 110px 110px 240px',
                      gap: 14,
                      padding: '14px 20px',
                      borderBottom: i < filteredTransfers.length - 1 ? '1px solid var(--border)' : 'none',
                      background: 'transparent',
                      alignItems: 'center',
                      transition: 'background 180ms ease'
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {/* Name + meta */}
                    <div style={{ minWidth: 0 }}>
                      <div
                        onClick={() => setActiveDetailsTransfer(t)}
                        style={{
                          fontWeight: 800,
                          fontSize: '0.92rem',
                          color: 'var(--text-1)',
                          marginBottom: 2,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          cursor: 'pointer'
                        }}
                      >
                        <span style={{ textDecoration: 'underline text-decoration-color: transparent', transition: 'all 150ms' }}
                          onMouseEnter={e => (e.currentTarget.style.textDecorationColor = 'var(--brand)')}
                          onMouseLeave={e => (e.currentTarget.style.textDecorationColor = 'transparent')}
                        >
                          {t.name || 'Untitled Transfer'}
                        </span>
                        {t.hasPassword && <LockIcon size={14} color="var(--brand)" />}
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-3)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span>{t.files.length} file{t.files.length !== 1 ? 's' : ''}</span>
                        <span>•</span>
                        <span>{formatDate(t.createdAt)}</span>
                        <span>•</span>
                        <span>{t.downloadCount}{t.maxDownloads ? `/${t.maxDownloads}` : ''} dl</span>
                        <span>•</span>
                        <span>{status === 'active' ? `Expires in ${timeUntilExpiry(t.expiresAt)}` : status === 'expired' ? 'Expired' : 'Paused'}</span>
                      </div>
                    </div>

                    {/* Size */}
                    <div style={{ fontSize: '0.86rem', color: 'var(--text-2)', fontWeight: 700 }}>
                      {formatBytes(parseInt(t.totalSize || '0'))}
                    </div>

                    {/* Status badge */}
                    <div>
                      <span className={`badge badge-${status}`} style={{ padding: '3px 10px', fontSize: '0.72rem' }}>
                        {status.toUpperCase()}
                      </span>
                    </div>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                      {/* Copy Link */}
                      <button
                        onClick={() => copyLink(t.token)}
                        disabled={isLoading}
                        title="Copy transfer link"
                        style={{
                          padding: '6px 9px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--glass-bg)',
                          cursor: 'pointer',
                          color: copied === t.token ? '#059669' : 'var(--text-1)',
                          transition: 'all 150ms ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {copied === t.token ? <CheckIcon size={14} color="#059669" /> : <LinkIcon size={14} />}
                      </button>

                      {/* Share channels */}
                      <button
                        onClick={() => setActiveShareTransfer(t)}
                        disabled={isLoading}
                        title="Share via WhatsApp, Telegram, X, Email"
                        style={{
                          padding: '6px 9px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--glass-bg)',
                          cursor: 'pointer',
                          color: 'var(--brand)',
                          transition: 'all 150ms ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <ShareSheetIcon size={14} color="var(--brand)" />
                      </button>

                      {/* QR Code */}
                      <button
                        onClick={() => setActiveQrTransfer(t)}
                        disabled={isLoading}
                        title="Show QR Code for mobile download"
                        style={{
                          padding: '6px 9px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--glass-bg)',
                          cursor: 'pointer',
                          color: 'var(--text-1)',
                          transition: 'all 150ms ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <QrCodeIcon size={14} />
                      </button>

                      {/* Details */}
                      <button
                        onClick={() => setActiveDetailsTransfer(t)}
                        disabled={isLoading}
                        title="Inspect files & download logs"
                        style={{
                          padding: '6px 9px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--glass-bg)',
                          cursor: 'pointer',
                          color: 'var(--text-1)',
                          transition: 'all 150ms ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <FolderIcon size={14} />
                      </button>

                      {/* Extend +7d */}
                      {status === 'active' && (
                        <button
                          onClick={() => extendTransfer(t.id)}
                          disabled={isLoading}
                          title="Extend validity +7 days"
                          style={{
                            padding: '6px 8px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            background: 'var(--glass-bg)',
                            cursor: 'pointer',
                            fontSize: '0.74rem',
                            color: 'var(--brand)',
                            transition: 'all 150ms ease',
                            fontWeight: 800
                          }}
                        >
                          +7d
                        </button>
                      )}

                      {/* Toggle Active / Pause */}
                      <button
                        onClick={() => toggleTransfer(t.id, t.isActive)}
                        disabled={isLoading}
                        title={t.isActive ? 'Pause transfer' : 'Activate transfer'}
                        style={{
                          padding: '6px 9px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--glass-bg)',
                          cursor: 'pointer',
                          color: 'var(--text-2)',
                          transition: 'all 150ms ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {t.isActive ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => deleteTransfer(t.id)}
                        disabled={isLoading}
                        title="Permanently delete transfer"
                        style={{
                          padding: '6px 9px',
                          borderRadius: 8,
                          border: '1px solid rgba(220,38,38,0.3)',
                          background: 'rgba(220,38,38,0.08)',
                          cursor: 'pointer',
                          color: '#dc2626',
                          transition: 'all 150ms ease',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <TrashIcon size={14} color="#dc2626" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Share Modal */}
      <ShareModal
        transfer={activeShareTransfer}
        isOpen={!!activeShareTransfer}
        onClose={() => setActiveShareTransfer(null)}
      />

      {/* Interactive QR Code Modal */}
      <QrCodeModal
        transfer={activeQrTransfer}
        isOpen={!!activeQrTransfer}
        onClose={() => setActiveQrTransfer(null)}
      />

      {/* Interactive Transfer Details Modal */}
      <TransferDetailsModal
        transfer={activeDetailsTransfer}
        isOpen={!!activeDetailsTransfer}
        onClose={() => setActiveDetailsTransfer(null)}
        onExtend={extendTransfer}
        onToggle={toggleTransfer}
      />

      {/* Interactive Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => {
          setUpgradeOpen(false)
          router.refresh()
        }}
        defaultPlan="pro"
      />
    </div>
  )
}
