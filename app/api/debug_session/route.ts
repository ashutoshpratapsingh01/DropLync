import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { cookies, headers } from 'next/headers'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const cookieStore = cookies()
  const allCookies = cookieStore.getAll()
  const rawCookieHeader = headers().get('cookie')
  const reqCookieHeader = req.headers.get('cookie')
  const authTokenFromStore = cookieStore.get('auth_token')?.value
  const user = await getSession()

  return NextResponse.json({
    allCookies,
    rawCookieHeader,
    reqCookieHeader,
    authTokenFromStore,
    user
  })
}
