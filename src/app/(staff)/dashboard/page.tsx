'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function DashboardRedirect() {
  const router = useRouter()
  const { role, loading } = useRole()

  useEffect(() => {
    if (!loading && role) {
      const paths: Record<string, string> = {
        admin: '/dashboard/admin',
        manager: '/dashboard/manager',
        cashier: '/dashboard/cashier',
        waiter: '/dashboard/waiter',
      }
      router.push(paths[role] || '/dashboard/waiter')
    }
  }, [role, loading, router])

  return (
    <div className="flex items-center justify-center h-64">
      <LoadingSpinner size="lg" />
    </div>
  )
}
