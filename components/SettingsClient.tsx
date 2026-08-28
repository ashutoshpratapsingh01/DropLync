'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  User, Shield, Palette, Key, Trash2, Check, AlertTriangle,
  LogOut, Plus, Copy, Globe, RefreshCw, Sparkles, ExternalLink
} from 'lucide-react'

interface UserProps {
  id: string
  email: string
  name: string | null
  role: string
  plan?: string
  avatar?: string | null
  brandColor?: string | null
  brandLogo?: string | null
  brandWallpaper?: string | null
}

export default function SettingsClient({ user: initialUser }: { user: UserProps }) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'branding' | 'developer' | 'billing'>('profile')
  const [user, setUser] = useState<UserProps>(initialUser)
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Profile State
  const [name, setName] = useState(initialUser.name || '')
  const [avatar, setAvatar] = useState(initialUser.avatar || '')

  // Security State
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [sessions, setSessions] = useState<any[]>([])
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // Branding State
  const [brandColor, setBrandColor] = useState(initialUser.brandColor || '#3b82f6')
  const [brandLogo, setBrandLogo] = useState(initialUser.brandLogo || '')
  const [brandWallpaper, setBrandWallpaper] = useState(initialUser.brandWallpaper || '')

  // Developer State
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copiedKey, setCopiedKey] = useState(false)
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [webhookUrl, setWebhookUrl] = useState('')

  useEffect(() => {
    if (activeTab === 'security') fetchSessions()
    if (activeTab === 'developer') {
      fetchApiKeys()
      fetchWebhooks()
    }
  }, [activeTab])

  function showMessage(type: 'success' | 'error', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 5000)
  }

  // --- Profile Handlers ---
  async function handleUpdateProfile(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, avatar })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update profile')
      setUser(prev => ({ ...prev, ...data.user }))
      showMessage('success', 'Profile updated successfully!')
    } catch (err: any) {
      showMessage('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- Security Handlers ---
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      showMessage('error', 'New passwords do not match')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/user/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update password')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      showMessage('success', 'Password changed successfully!')
    } catch (err: any) {
      showMessage('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function fetchSessions() {
    try {
      const res = await fetch('/api/user/sessions')
      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch {}
  }

  async function handleRevokeOtherSessions() {
    setLoading(true)
    try {
      const res = await fetch('/api/user/sessions', { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to revoke sessions')
      showMessage('success', data.message || 'Other sessions revoked')
      fetchSessions()
    } catch (err: any) {
      showMessage('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return
    setLoading(true)
    try {
      const res = await fetch('/api/user/account', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to delete account')
      }
      router.push('/login?deleted=true')
    } catch (err: any) {
      showMessage('error', err.message)
      setLoading(false)
    }
  }

  // --- Branding Handlers ---
  async function handleSaveBranding(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/user/branding', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ brandColor, brandLogo, brandWallpaper })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update branding')
      showMessage('success', 'Custom branding saved! Applied to all your share pages.')
    } catch (err: any) {
      showMessage('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  // --- Developer API Keys & Webhooks ---
  async function fetchApiKeys() {
    try {
      const res = await fetch('/api/user/api-keys')
      if (res.ok) {
        const data = await res.json()
        setApiKeys(data.apiKeys || [])
      }
    } catch {}
  }

  async function handleCreateApiKey(e: React.FormEvent) {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/user/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create API key')
      setCreatedKey(data.apiKey.key)
      setNewKeyName('')
      fetchApiKeys()
    } catch (err: any) {
      showMessage('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRevokeApiKey(id: string) {
    try {
      await fetch(`/api/user/api-keys?id=${id}`, { method: 'DELETE' })
      fetchApiKeys()
      showMessage('success', 'API key revoked')
    } catch {}
  }

  async function fetchWebhooks() {
    try {
      const res = await fetch('/api/user/webhooks')
      if (res.ok) {
        const data = await res.json()
        setWebhooks(data.webhooks || [])
      }
    } catch {}
  }

  async function handleCreateWebhook(e: React.FormEvent) {
    e.preventDefault()
    if (!webhookUrl.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/user/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webhookUrl })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to add webhook')
      setWebhookUrl('')
      fetchWebhooks()
      showMessage('success', 'Webhook endpoint registered!')
    } catch (err: any) {
      showMessage('error', err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteWebhook(id: string) {
    try {
      await fetch(`/api/user/webhooks?id=${id}`, { method: 'DELETE' })
      fetchWebhooks()
      showMessage('success', 'Webhook endpoint removed')
    } catch {}
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-white/10 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight">Account & Security</h1>
          <p className="text-gray-400 mt-1">Manage your profile, login credentials, custom branding, and developer keys.</p>
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-400 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          Plan: {user.plan || 'Free Tier (10GB)'}
        </div>
      </div>

      {/* Notifications */}
      {msg && (
        <div className={`p-4 rounded-xl flex items-center gap-3 animate-fade-in ${
          msg.type === 'success' ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300' : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
        }`}>
          {msg.type === 'success' ? <Check className="w-5 h-5 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 flex-shrink-0" />}
          <span className="text-sm font-medium">{msg.text}</span>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex border-b border-white/10 overflow-x-auto gap-2">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'profile' ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <User className="w-4 h-4" /> Profile
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'security' ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Shield className="w-4 h-4" /> Security & Privacy
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'branding' ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Palette className="w-4 h-4" /> Custom Branding
        </button>
        <button
          onClick={() => setActiveTab('developer')}
          className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm transition-colors whitespace-nowrap ${
            activeTab === 'developer' ? 'border-brand-500 text-brand-400' : 'border-transparent text-gray-400 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" /> Developer (API & Webhooks)
        </button>
      </div>

      {/* TAB 1: Profile */}
      {activeTab === 'profile' && (
        <form onSubmit={handleUpdateProfile} className="bg-[#121722] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 max-w-2xl">
          <h2 className="text-xl font-bold text-white">Profile Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                value={user.email}
                disabled
                className="w-full bg-[#181f2e] border border-white/10 rounded-xl px-4 py-3 text-gray-400 cursor-not-allowed text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Email is verified and cannot be changed.</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name or alias"
                className="w-full bg-[#181f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Avatar URL</label>
              <input
                type="url"
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://example.com/avatar.png"
                className="w-full bg-[#181f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-white text-sm transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            {loading ? 'Saving Changes...' : 'Save Profile'}
          </button>
        </form>
      )}

      {/* TAB 2: Security & Privacy */}
      {activeTab === 'security' && (
        <div className="space-y-8 max-w-3xl">
          {/* Password Change */}
          <form onSubmit={handleChangePassword} className="bg-[#121722] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
            <h2 className="text-xl font-bold text-white">Change Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-[#181f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">New Password (Min 8 chars)</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#181f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-[#181f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 text-sm"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading || !newPassword}
              className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-white text-sm transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
            >
              Update Password
            </button>
          </form>

          {/* Active Sessions */}
          <div className="bg-[#121722] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Active Sessions</h2>
                <p className="text-sm text-gray-400 mt-1">Manage and revoke other browser sessions logged into your account.</p>
              </div>
              <button
                type="button"
                onClick={handleRevokeOtherSessions}
                disabled={loading || sessions.length <= 1}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-gray-200 transition-colors disabled:opacity-40"
              >
                Log Out Other Devices
              </button>
            </div>
            <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden">
              {sessions.map((s) => (
                <div key={s.id} className="p-4 flex items-center justify-between bg-[#151c2a]">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">{s.userAgent}</span>
                      {s.isCurrent && (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase">
                          Current Device
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">IP: {s.ipAddress} • Created: {new Date(s.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* GDPR Account Deletion */}
          <div className="bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 md:p-8 space-y-4">
            <h2 className="text-xl font-bold text-rose-400 flex items-center gap-2">
              <Trash2 className="w-5 h-5" /> Delete Account (GDPR Right to Be Forgotten)
            </h2>
            <p className="text-sm text-gray-400">
              Permanently delete your account, authentication credentials, and all uploaded files from storage. This action is irreversible.
            </p>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 font-bold text-sm transition-colors"
            >
              Delete My Account & Files
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: Custom Branding */}
      {activeTab === 'branding' && (
        <form onSubmit={handleSaveBranding} className="bg-[#121722] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6 max-w-2xl">
          <div>
            <h2 className="text-xl font-bold text-white">Custom Download Page Branding</h2>
            <p className="text-sm text-gray-400 mt-1">Personalize the public download experience on your `/f/[token]` share pages.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Accent / Brand Color</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-12 h-12 rounded-xl bg-transparent cursor-pointer border border-white/20 p-1"
                />
                <input
                  type="text"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-36 bg-[#181f2e] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Custom Logo URL</label>
              <input
                type="url"
                value={brandLogo}
                onChange={(e) => setBrandLogo(e.target.value)}
                placeholder="https://yourcompany.com/logo.png"
                className="w-full bg-[#181f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">Custom Background Wallpaper URL</label>
              <input
                type="url"
                value={brandWallpaper}
                onChange={(e) => setBrandWallpaper(e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
                className="w-full bg-[#181f2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand-500 text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-white text-sm transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50"
          >
            Save Branding
          </button>
        </form>
      )}

      {/* TAB 4: Developer (API & Webhooks) */}
      {activeTab === 'developer' && (
        <div className="space-y-8 max-w-3xl">
          {/* API Keys */}
          <div className="bg-[#121722] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">API Keys</h2>
              <p className="text-sm text-gray-400 mt-1">Authenticate programmatic requests using the `x-api-key` header.</p>
            </div>

            {createdKey && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider">Your New API Key (Save it now — it won't be shown again):</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-black/40 px-3 py-2 rounded-lg font-mono text-xs text-amber-200 select-all">{createdKey}</code>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(createdKey)
                      setCopiedKey(true)
                      setTimeout(() => setCopiedKey(false), 2000)
                    }}
                    className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200"
                  >
                    {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateApiKey} className="flex gap-3">
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key label (e.g. CI/CD Pipeline)"
                className="flex-1 bg-[#181f2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={loading || !newKeyName.trim()}
                className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-white text-sm transition-all disabled:opacity-40"
              >
                Create Key
              </button>
            </form>

            <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden">
              {apiKeys.length === 0 ? (
                <p className="p-4 text-xs text-gray-500 italic">No active API keys.</p>
              ) : (
                apiKeys.map((k) => (
                  <div key={k.id} className="p-4 flex items-center justify-between bg-[#151c2a]">
                    <div>
                      <span className="text-sm font-semibold text-white">{k.name}</span>
                      <p className="text-xs font-mono text-gray-400">{k.key}</p>
                    </div>
                    <button
                      onClick={() => handleRevokeApiKey(k.id)}
                      className="p-2 text-gray-400 hover:text-rose-400 transition-colors"
                      title="Revoke key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Webhooks */}
          <div className="bg-[#121722] border border-white/10 rounded-2xl p-6 md:p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold text-white">Outgoing Webhooks</h2>
              <p className="text-sm text-gray-400 mt-1">Receive automated POST event payloads when transfers are created or downloaded.</p>
            </div>

            <form onSubmit={handleCreateWebhook} className="flex gap-3">
              <input
                type="url"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://yourserver.com/api/webhooks"
                className="flex-1 bg-[#181f2e] border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                disabled={loading || !webhookUrl.trim()}
                className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 font-bold text-white text-sm transition-all disabled:opacity-40"
              >
                Add Endpoint
              </button>
            </form>

            <div className="divide-y divide-white/5 border border-white/5 rounded-xl overflow-hidden">
              {webhooks.length === 0 ? (
                <p className="p-4 text-xs text-gray-500 italic">No registered webhooks.</p>
              ) : (
                webhooks.map((w) => (
                  <div key={w.id} className="p-4 flex items-center justify-between bg-[#151c2a]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-brand-400" />
                        <span className="text-sm font-semibold text-white">{w.url}</span>
                      </div>
                      <p className="text-xs text-gray-400">Events: {w.events.join(', ')}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteWebhook(w.id)}
                      className="p-2 text-gray-400 hover:text-rose-400 transition-colors"
                      title="Remove webhook"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#151a26] border border-rose-500/30 rounded-2xl p-6 md:p-8 max-w-md w-full space-y-4 text-left shadow-2xl">
            <h3 className="text-xl font-bold text-rose-400">Permanently Delete Account?</h3>
            <p className="text-sm text-gray-300">
              All your files, transfers, links, and session data will be permanently wiped. Type <strong className="text-white font-mono">DELETE</strong> to confirm:
            </p>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-[#0d111a] border border-rose-500/40 rounded-xl px-4 py-3 text-white focus:outline-none text-sm font-mono text-center tracking-widest uppercase"
            />
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 font-bold text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || loading}
                className="flex-1 py-3 rounded-xl bg-rose-500 hover:bg-rose-600 font-bold text-white text-sm transition-colors disabled:opacity-40"
              >
                {loading ? 'Deleting...' : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
