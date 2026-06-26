'use client'

import { useLanguage } from '@/hooks/use-language'
import { useOrgReports } from '@/hooks/use-org-reports'
import { useTenant } from '@/hooks/use-tenant'
import { useSelectedBranch } from '@/hooks/use-selected-branch'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { ExecutiveKPICards } from '@/components/owner/executive-kpi-cards'
import { RevenueChart } from '@/components/owner/revenue-chart'
import { BranchComparison } from '@/components/owner/branch-comparison'
import { PopularItemsCard } from '@/components/owner/popular-items-card'
import { PayrollSummaryCard } from '@/components/owner/payroll-summary-card'
import { SystemHealthCard } from '@/components/owner/system-health-card'
import { BarChart3 } from 'lucide-react'

export default function OrgReportsPage() {
  const { t } = useLanguage()
  const { restaurantId, isLoaded } = useTenant()
  const { selectedBranchId } = useSelectedBranch(isLoaded ? restaurantId : null)
  const { data, loading, error, refetch } = useOrgReports(selectedBranchId)

  if (loading) return <LoadingSpinner size="lg" />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-red-600">{error}</p>
        <button onClick={refetch} className="mt-4 text-sm text-muted-foreground underline hover:text-foreground">
          {t('org.reports.retry')}
        </button>
      </div>
    )
  }

  if (!data) return null

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              {t('org.reports.badge')}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('org.reports.title')}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t('org.reports.subtitle')}
            </p>
          </div>
        </div>
      </section>

      <ExecutiveKPICards overview={data.overview} t={t} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueChart trends={data.revenue_trends} growth={data.growth_metrics} t={t} />
        <BranchComparison branches={data.branch_performance} t={t} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <PopularItemsCard items={data.popular_items} t={t} />
        <SystemHealthCard overview={data.overview} inventory={data.inventory_summary} t={t} />
      </div>

      <PayrollSummaryCard payroll={data.payroll_summary} t={t} />
    </div>
  )
}
