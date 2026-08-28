import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth, verifyPassword, hashPassword } from '@/lib/auth'
import { apiError, apiSuccess } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { currentPassword, newPassword } = await req.json()

    if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 8) {
      return apiError('New password must be at least 8 characters long', 400)
    }

    const dbUser = await prisma.user.findUnique({ where: { id: user.id } })
    if (!dbUser) return apiError('User not found', 404)

    // If user already has a password, verify current password
    if (dbUser.passwordHash) {
      if (!currentPassword) {
        return apiError('Current password is required', 400)
      }
      const isValid = await verifyPassword(currentPassword, dbUser.passwordHash)
      if (!isValid) {
        return apiError('Incorrect current password', 400)
      }
    }

    const newHash = await hashPassword(newPassword)
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: newHash }
    })

    return apiSuccess({ success: true, message: 'Password updated successfully' })
  } catch (error: any) {
    return apiError(error?.message || 'Failed to update password', 400)
  }
}
