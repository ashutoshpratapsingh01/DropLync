import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { apiSuccess } from '@/lib/utils'
import { cookies } from 'next/headers'

export async function POST(req: NextRequest) {
  const cookieStore = cookies()
  const token = cookieStore.get('auth_token')?.value
  if (token) {
    await prisma.session.deleteMany({ where: { token } })
    cookieStore.delete('auth_token')
  }
  return apiSuccess({ ok: true })
}
