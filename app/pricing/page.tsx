import { getSession } from '@/lib/auth'
import PricingClient from '@/components/PricingClient'

export const metadata = {
  title: 'Pricing & Plans — DropLync',
  description: 'Upload up to 10GB free. Upgrade to Pro for 50GB, Ultra for 200GB, or Enterprise for unlimited storage tiers.'
}

export default async function PricingPage() {
  const user = await getSession()
  return <PricingClient user={user} />
}
