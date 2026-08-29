import { redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import SettingsClient from '@/components/SettingsClient'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export const metadata = {
  title: 'Account Settings — DropLync',
  description: 'Manage your DropLync profile, security settings, branding, API keys, and subscriptions.'
}

export default async function SettingsPage() {
  const user = await getSession()
  if (!user) {
    redirect('/login?redirect=/settings')
  }

  return (
    <div className="min-h-screen bg-[#0a0d14] text-white flex flex-col selection:bg-brand-500/30">
      <Navbar user={user} />
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-10">
        <SettingsClient user={user} />
      </main>
    </div>
  )
}
