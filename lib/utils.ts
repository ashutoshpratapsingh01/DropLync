import crypto from 'crypto'

export function generateSecureToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('base64url')
}

export function formatBytes(bytes: number | bigint | string): string {
  const n = typeof bytes === 'bigint' ? Number(bytes) : typeof bytes === 'string' ? Number(bytes) : bytes
  if (isNaN(n) || n <= 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(k)), sizes.length - 1)
  return `${parseFloat((n / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric'
  })
}

export function getExpiryDate(days: number): Date {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d
}

export function timeUntilExpiry(expiresAt: Date | string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  if (diff <= 0) return 'Expired'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((diff % 3600000) / 60000)
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
}

export function getMimeIcon(mimeType: string): string {
  if (!mimeType) return '📁'
  if (mimeType.startsWith('image/')) return '🖼️'
  if (mimeType.startsWith('video/')) return '🎬'
  if (mimeType.startsWith('audio/')) return '🎵'
  if (mimeType.includes('pdf')) return '📄'
  if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('tar') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📝'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📊'
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📋'
  if (mimeType.includes('text') || mimeType.includes('json') || mimeType.includes('xml')) return '📃'
  return '📁'
}

/**
 * Recursively convert BigInt to string and Date to ISO string for safe JSON serialization
 */
function serializeBigInt(obj: any): any {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return obj.toString()
  if (obj instanceof Date) return obj.toISOString()
  if (Array.isArray(obj)) return obj.map(serializeBigInt)
  if (typeof obj === 'object') {
    const res: Record<string, any> = {}
    for (const key of Object.keys(obj)) {
      res[key] = serializeBigInt(obj[key])
    }
    return res
  }
  return obj
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export function apiSuccess(data: unknown, status = 200) {
  return Response.json(serializeBigInt(data), { status })
}

// Rate limiting (in-memory, use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (entry.count >= limit) return false
  entry.count++
  return true
}

/**
 * Anonymizes an IP address for GDPR/CCPA privacy compliance
 * - IPv4: zeros the last octet (192.168.1.45 -> 192.168.1.0)
 * - IPv6: retains the /64 routing prefix (2001:db8:abcd:0012:... -> 2001:db8:abcd:0012::)
 */
export function anonymizeIp(ip: string | null | undefined): string {
  if (!ip || ip === 'unknown' || ip === '::1' || ip === '127.0.0.1') return '127.0.0.0'
  
  const clientIp = ip.split(',')[0].trim()
  
  if (clientIp.includes('.')) {
    const parts = clientIp.split('.')
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.${parts[2]}.0`
    }
  }
  
  if (clientIp.includes(':')) {
    const parts = clientIp.split(':')
    if (parts.length >= 4) {
      return `${parts.slice(0, 4).join(':')}::`
    }
  }
  
  return 'anonymous'
}

