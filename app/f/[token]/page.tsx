import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { getSession } from '@/lib/auth'
import DownloadClient from '@/components/DownloadClient'

export default async function DownloadPage({ params }: { params: { token: string } }) {
  const user = await getSession()
  return (
    <>
      <Navbar user={user} />
      <DownloadClient token={params.token} />
    </>
  )
}
