'use client'
import { useState } from 'react'
import { formatBytes, formatDate } from '@/lib/utils'
import { useScrollReveal } from '@/hooks/useScrollReveal'
import Tilt3D from '@/components/ui/Tilt3D'
import {
  UsersIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  ArrowDownTrayIcon,
  HardDriveIcon,
  TrashIcon
} from '@/components/ui/Icons'

type User = {
  id: string; email: string; name: string | null; role: string
  isActive: boolean; createdAt: string; plan?: string; _count: { transfers: number }
}

type Transfer = {
  id: string; token: string; name: string | null; totalSize: string
  downloadCount: number; expiresAt: string; isActive: boolean; createdAt: string
  user: { email: string; name: string | null } | null
  _count: { files: number }
}

type Stats = {
  users: number; transfers: number; activeTransfers: number
  totalDownloads: number; totalStorage: string
}

export default function AdminClient({
  stats, users: initialUsers, transfers: initialTransfers
}: {
  stats: Stats; users: User[]; transfers: Transfer[]
}) {
  useScrollReveal()
  const [users, setUsers] = useState(initialUsers)
  const [transfers, setTransfers] = useState(initialTransfers)
  const [activeTab, setActiveTab] = useState<'transfers' | 'users'>('transfers')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function toggleUser(userId: string, currentActive: boolean) {
    setActionLoading(userId)
    await fetch(`/api/admin/users/${userId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !currentActive })
    })
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, isActive: !currentActive } : u))
    setActionLoading(null)
  }

  async function deleteTransfer(transferId: string) {
    if (!confirm('Delete transfer and all files permanently?')) return
    setActionLoading(transferId)
    await fetch(`/api/admin/transfers/${transferId}`, { method: 'DELETE' })
    setTransfers(prev => prev.filter(t => t.id !== transferId))
    setActionLoading(null)
  }

  const STAT_CARDS = [
    { label: 'Total Users', value: stats.users, icon: <UsersIcon size={20} color="#2563eb" />, color: 'rgba(37,99,235,0.12)' },
    { label: 'Total Transfers', value: stats.transfers, icon: <ArrowUpTrayIcon size={20} color="#0284c7" />, color: 'rgba(2,132,199,0.12)' },
    { label: 'Active Sessions', value: stats.activeTransfers, icon: <CheckCircleIcon size={20} color="#059669" />, color: 'rgba(5,150,105,0.12)' },
    { label: 'Total Downloads', value: stats.totalDownloads, icon: <ArrowDownTrayIcon size={20} color="#06b6d4" />, color: 'rgba(6,182,212,0.12)' },
    { label: 'Storage Used', value: formatBytes(parseInt(stats.totalStorage || '0')), icon: <HardDriveIcon size={20} color="#3b82f6" />, color: 'rgba(59,130,246,0.12)' },
  ]

  return (
    <main style={{ padding: '32px 0 80px', background: 'var(--bg-soft)', minHeight: '100vh' }}>
      <div className="section-container">
        <div className="reveal" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
            <span style={{ padding: '3px 10px', borderRadius: 999, background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', color: '#dc2626', fontSize: '0.74rem', fontWeight: 800 }}>
              ADMIN CONSOLE
            </span>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>Platform Overview</h1>
          </div>
          <p style={{ color: 'var(--text-2)', fontSize: '0.92rem' }}>Manage users, monitor transfers, and review storage consumption</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 28 }}>
          {STAT_CARDS.map((card, i) => (
            <Tilt3D key={i} intensity={5}>
              <div className={`card card-hover reveal reveal-delay-${i + 1}`} style={{ padding: '18px 16px' }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: card.color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, border: '1px solid var(--border)' }}>
                  {card.icon}
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: 2, color: 'var(--text-1)', letterSpacing: '-0.03em' }}>{card.value}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', fontWeight: 700 }}>{card.label}</div>
              </div>
            </Tilt3D>
          ))}
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
          <button
            onClick={() => setActiveTab('transfers')}
            className={activeTab === 'transfers' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 20px', fontSize: '0.86rem' }}
          >
            All Transfers ({transfers.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}
            style={{ padding: '8px 20px', fontSize: '0.86rem' }}
          >
            All Users ({users.length})
          </button>
        </div>

        {/* Transfers table */}
        {activeTab === 'transfers' && (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px 100px 100px 100px 80px', gap: 12, padding: '12px 20px', background: 'var(--glass-bg-subtle)', borderBottom: '1px solid var(--border)', fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <div>Transfer</div>
              <div>Owner</div>
              <div>Size</div>
              <div>Downloads</div>
              <div>Status</div>
              <div style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {transfers.map((t, i) => {
              const isExpired = new Date(t.expiresAt) <= new Date()
              const status = !t.isActive ? 'disabled' : isExpired ? 'expired' : 'active'

              return (
                <div
                  key={t.id}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 140px 100px 100px 100px 80px', gap: 12,
                    padding: '12px 20px', borderBottom: i < transfers.length - 1 ? '1px solid var(--border)' : 'none',
                    alignItems: 'center', transition: 'background 150ms ease'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.04)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
                      {t.name || 'Untitled'}
                    </div>
                    <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>
                      {t._count.files} file{t._count.files !== 1 ? 's' : ''} · {formatDate(t.createdAt)}
                    </div>
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t.user?.email || <span style={{ color: 'var(--text-3)' }}>Anonymous</span>}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', fontWeight: 700 }}>
                    {formatBytes(parseInt(t.totalSize || '0'))}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{t.downloadCount} dl</div>
                  <div>
                    <span className={`badge badge-${status}`} style={{ padding: '3px 8px', fontSize: '0.7rem' }}>
                      {status.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => deleteTransfer(t.id)}
                      disabled={actionLoading === t.id}
                      style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(220,38,38,0.3)', background: 'rgba(220,38,38,0.08)', cursor: 'pointer', fontSize: '0.76rem', color: '#dc2626', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <TrashIcon size={14} color="#dc2626" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Users table */}
        {activeTab === 'users' && (
          <div className="glass-panel" style={{ overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 100px 120px', gap: 12, padding: '12px 20px', background: 'var(--glass-bg-subtle)', borderBottom: '1px solid var(--border)', fontSize: '0.74rem', fontWeight: 800, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <div>User</div>
              <div>Tier Plan</div>
              <div>Role</div>
              <div>Transfers</div>
              <div>Status</div>
              <div style={{ textAlign: 'right' }}>Actions</div>
            </div>

            {users.map((u, i) => (
              <div
                key={u.id}
                style={{
                  display: 'grid', gridTemplateColumns: '1fr 100px 100px 100px 100px 120px', gap: 12,
                  padding: '12px 20px', borderBottom: i < users.length - 1 ? '1px solid var(--border)' : 'none',
                  alignItems: 'center', transition: 'background 150ms ease'
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(37,99,235,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.88rem', color: 'var(--text-1)' }}>{u.name || 'No name'}</div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-3)' }}>{u.email}</div>
                </div>
                <div>
                  <span style={{ padding: '2px 8px', borderRadius: 999, background: 'rgba(37,99,235,0.1)', color: 'var(--brand)', fontSize: '0.72rem', fontWeight: 800 }}>
                    {(u.plan || 'free').toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className={`badge ${u.role === 'admin' ? 'badge-expired' : 'badge-active'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                    {u.role.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-2)' }}>{u._count.transfers}</div>
                <div>
                  <span className={`badge ${u.isActive ? 'badge-active' : 'badge-disabled'}`} style={{ padding: '2px 8px', fontSize: '0.7rem' }}>
                    {u.isActive ? 'ACTIVE' : 'SUSPENDED'}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => toggleUser(u.id, u.isActive)}
                      disabled={actionLoading === u.id}
                      style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--glass-bg)', cursor: 'pointer', fontSize: '0.76rem', color: u.isActive ? '#dc2626' : '#059669', fontWeight: 700 }}
                    >
                      {u.isActive ? 'Suspend' : 'Activate'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
