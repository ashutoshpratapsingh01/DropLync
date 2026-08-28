import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { apiError, apiSuccess } from '@/lib/utils'
import { PLANS } from '@/lib/plans'

export async function POST(req: NextRequest) {
  try {
    const user = await getSession()
    if (!user) {
      return apiError('Unauthorized. Please sign in.', 401)
    }

    const { planId, billingInterval = 'monthly' } = await req.json()

    if (!planId || !PLANS[planId]) {
      return apiError('Invalid subscription plan selected', 400)
    }

    const expiresAt = new Date()
    if (billingInterval === 'yearly') {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1)
    } else {
      expiresAt.setMonth(expiresAt.getMonth() + 1)
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        plan: planId,
        planExpiresAt: expiresAt
      }
    })

    return apiSuccess({
      message: `Successfully upgraded to ${PLANS[planId].name} (Test Mode)`,
      user: {
        id: updated.id,
        email: updated.email,
        plan: updated.plan,
        planExpiresAt: updated.planExpiresAt
      }
    })
  } catch (err: any) {
    return apiError(err.message || 'Failed to complete mock upgrade', 500)
  }
}
