'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth, useRole } from '@/hooks/use-auth'
import { DashboardShell } from '@/components/layout/dashboard-shell'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, loading } = useAuth()
  const { role } = useRole()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (!user || !role) return null

  return <DashboardShell role={role}>{children}</DashboardShell>
}
