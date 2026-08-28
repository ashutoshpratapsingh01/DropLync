import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { deleteTransferFiles } from '@/lib/storage'
import { apiError, apiSuccess } from '@/lib/utils'
import { cookies } from 'next/headers'

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth()

    // 1. Find all transfers owned by this user
    const userTransfers = await prisma.transfer.findMany({
      where: { userId: user.id },
      select: { id: true }
    })

    // 2. Wipe files from physical disk storage
    for (const t of userTransfers) {
      try {
        await deleteTransferFiles(t.id)
      } catch (err) {
        console.warn(`Could not delete storage files for transfer ${t.id}:`, err)
      }
    }

    // 3. Delete database user (cascades to Transfers, Sessions, ApiKeys, Webhooks)
    await prisma.user.delete({
      where: { id: user.id }
    })

    // 4. Delete verification tokens
    await prisma.verificationToken.deleteMany({
      where: { email: user.email }
    })

    // 5. Clear cookie
    cookies().delete('auth_token')

    return apiSuccess({
      success: true,
      message: 'Your account and all associated transfers have been permanently deleted.'
    })
  } catch (error: any) {
    console.error('Account deletion error:', error)
    return apiError(error?.message || 'Failed to delete account', 500)
  }
}
