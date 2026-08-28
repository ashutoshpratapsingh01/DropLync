import { getSession } from '@/lib/auth'
import Navbar from '@/components/Navbar'
import LandingClient from '@/components/LandingClient'

export default async function HomePage() {
  const user = await getSession()
  return (
    <>
      <Navbar user={user} />
      <LandingClient />
    </>
  )
}
