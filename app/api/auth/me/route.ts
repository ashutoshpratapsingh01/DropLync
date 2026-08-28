import { getSession } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function GET() {
  const user = await getSession()
  if (!user) return apiError('Unauthorized', 401)
  return apiSuccess({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: (user as any).plan || 'free',
      planExpiresAt: (user as any).planExpiresAt || null
    }
  })
}
