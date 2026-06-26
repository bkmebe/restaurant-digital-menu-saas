'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function OrganizationReportsRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/dashboard/org/reports')
  }, [router])

  return <LoadingSpinner size="lg" />
}
