'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { useTableAssignment } from '@/hooks/use-table-assignment'
import { TableAssignmentView } from '@/components/tables/table-assignment-view'
import { Button } from '@/components/ui/button'
import { ArrowLeft, RefreshCw } from 'lucide-react'

export default function TableAssignmentPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { t } = useLanguage()
  const { tables, waiters, loading, error, fetchData, assignWaiter, unassignWaiter } = useTableAssignment(profile?.restaurant_id)

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchData()
    }
  }, [profile?.restaurant_id, fetchData])

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t('tableAssignment.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('tableAssignment.subtitle')}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      <TableAssignmentView
        tables={tables}
        waiters={waiters}
        loading={loading}
        error={error}
        onAssign={assignWaiter}
        onUnassign={unassignWaiter}
      />
    </div>
  )
}
