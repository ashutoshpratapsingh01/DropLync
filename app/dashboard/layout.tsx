import { getSession } from '@/lib/auth'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getSession()
  return (
    <>
      <Navbar user={user || undefined} />
      {children}
    </>
  )
}
