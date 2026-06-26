'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useRole } from '@/hooks/use-auth'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function DashboardRedirect() {
  const router = useRouter()
  const { role, loading } = useRole()

  useEffect(() => {
    if (loading) return
    if (role) {
      const paths: Record<string, string> = {
        admin: '/dashboard/admin',
        manager: '/dashboard/manager',
        cashier: '/dashboard/cashier',
        waiter: '/dashboard/waiter',
        kitchen_staff: '/dashboard/kitchen',
        inventory_manager: '/dashboard/inventory',
        owner: '/dashboard/owner',
        system_admin: '/dashboard/admin',
      }
      router.push(paths[role] || '/dashboard/waiter')
    } else {
      router.push('/login')
    }
  }, [role, loading, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center h-64">
      <p className="text-muted-foreground">Redirecting...</p>
    </div>
  )
}
