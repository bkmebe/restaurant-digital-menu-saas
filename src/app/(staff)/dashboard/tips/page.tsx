'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { useTipSummary } from '@/hooks/use-tips'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { TipSummaryCards } from '@/components/tips/tip-summary-cards'
import { TipEntry } from '@/components/tips/tip-entry'
import { TipList } from '@/components/tips/tip-list'
import { TipPoolCard } from '@/components/tips/tip-pool-card'
import { TipPoolManager } from '@/components/tips/tip-pool-manager'
import { TipPayoutReport } from '@/components/tips/tip-payout-report'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, DollarSign, RefreshCw, Plus } from 'lucide-react'
import Link from 'next/link'

export default function TipsPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { summary, loading, fetchSummary } = useTipSummary()

  const [employees, setEmployees] = useState<Array<{ id: string; name: string; role: string }>>([])
  const [openPools, setOpenPools] = useState<Array<any>>([])

  const isManager = profile && ['admin', 'manager', 'system_admin'].includes(profile.role)
  const isWaiter = profile?.role === 'waiter'

  useEffect(() => {
    if (!profile?.restaurant_id) return
    fetchSummary()
    fetchEmployees()
    fetchOpenPools()
  }, [profile?.restaurant_id, fetchSummary])

  const fetchEmployees = async () => {
    try {
      const res = await fetch('/api/employees')
      if (!res.ok) return
      const body = await res.json()
      setEmployees(body.data || [])
    } catch { /* silent */ }
  }

  const fetchOpenPools = async () => {
    try {
      const res = await fetch('/api/tips/pools?status=open')
      if (!res.ok) return
      const body = await res.json()
      setOpenPools(body.data || [])
    } catch { /* silent */ }
  }

  const handleRefresh = () => {
    fetchSummary()
    fetchOpenPools()
  }

  if (!isFeatureEnabled('tips')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t('tips.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('tips.subtitle')}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {t('common.refresh')}
        </Button>
      </div>

      <TipSummaryCards
        totalAmount={summary?.total_amount || 0}
        pendingAmount={summary?.pending_amount || 0}
        paidOutAmount={summary?.paid_out_amount || 0}
        poolCount={summary?.pools?.open || 0}
        loading={loading}
      />

      <Tabs defaultValue={isWaiter ? 'entry' : 'overview'} className="space-y-4">
        <TabsList>
          {(isWaiter || isManager) && (
            <TabsTrigger value="entry" className="gap-2">
              <Plus className="h-4 w-4" />
              {t('tips.addTip')}
            </TabsTrigger>
          )}
          <TabsTrigger value="overview" className="gap-2">
            <DollarSign className="h-4 w-4" />
            {t('tips.tipList')}
          </TabsTrigger>
          {isManager && (
            <>
              <TabsTrigger value="pools" className="gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                </svg>
                {t('tips.tipPools')}
              </TabsTrigger>
              <TabsTrigger value="payouts" className="gap-2">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 0 4.5 6h.75M3.75 4.5h17.25M3.75 4.5v9.75M21 4.5v.75A.75.75 0 0 1 20.25 6H19.5M21 4.5v9.75m-17.25 0h17.25m-17.25 0a2.25 2.25 0 0 0 2.25 2.25h12.75a2.25 2.25 0 0 0 2.25-2.25M3.75 16.5h17.25" />
                </svg>
                {t('tips.payoutReports')}
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="entry">
          <TipEntry
            employees={employees}
            pools={openPools}
            onSuccess={handleRefresh}
          />
        </TabsContent>

        <TabsContent value="overview">
          <TipList />
        </TabsContent>

        {isManager && (
          <>
            <TabsContent value="pools">
              <TipPoolManager
                employees={employees}
                openPools={openPools}
                onRefresh={handleRefresh}
              />
            </TabsContent>
            <TabsContent value="payouts">
              <TipPayoutReport />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
