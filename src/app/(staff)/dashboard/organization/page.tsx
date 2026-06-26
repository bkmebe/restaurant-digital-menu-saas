'use client'

import { useLanguage } from '@/hooks/use-language'
import { useOrganizationAnalytics } from '@/hooks/use-organization-analytics'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { OrganizationKPICards } from '@/components/organization/organization-kpi-cards'
import { OrganizationGrowthCard } from '@/components/organization/organization-growth-card'
import { OrganizationRevenueChart } from '@/components/organization/organization-revenue-chart'
import { InventorySummaryCard } from '@/components/organization/inventory-summary-card'
import { PayrollSummaryCard } from '@/components/organization/payroll-summary-card'
import { StaffSummaryCard } from '@/components/organization/staff-summary-card'
import { BarChart3 } from 'lucide-react'
import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

export default function OrganizationDashboardPage() {
  const { t } = useLanguage()
  const { data: overview, loading, error, refetch } = useOrganizationAnalytics()

  if (loading) return <LoadingSpinner size="lg" />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-red-600">{error}</p>
        <button onClick={refetch} className="mt-4 text-sm text-muted-foreground underline hover:text-foreground">
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5" />
              {t('organization.badge')}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('organization.title')}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t('organization.subtitle')}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/dashboard/organization/revenue" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
              {t('organization.viewRevenue')}
            </Link>
            <Link href="/dashboard/organization/branches" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-2')}>
              {t('organization.viewBranches')}
            </Link>
            <Link href="/dashboard/organization/reports" className={cn(buttonVariants({ variant: 'default', size: 'sm' }), 'gap-2')}>
              {t('organization.viewReports')}
            </Link>
          </div>
        </div>
      </section>

      {overview && (
        <>
          <OrganizationKPICards overview={overview} t={t} />

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <OrganizationRevenueChart
                trends={[]}
                trend={overview.revenueGrowth}
                totalRevenue={overview.totalRevenue}
                averageDailyRevenue={overview.revenueMonth > 0 ? overview.revenueMonth / 30 : 0}
                t={t}
              />
            </div>
            <OrganizationGrowthCard
              revenueGrowth={overview.revenueGrowth}
              orderGrowth={overview.orderGrowth}
              revenueMonth={overview.revenueMonth}
              ordersMonth={overview.ordersMonth}
              t={t}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <InventorySummaryCard
                totalIngredients={overview.menuItemCount}
                lowStockCount={overview.lowStockCount}
                totalValue={overview.totalInventoryValue}
                t={t}
              />
            </div>
            <div className="lg:col-span-1">
              <StaffSummaryCard
                stats={{ total: overview.activeEmployees, active: overview.activeEmployees, byRole: {} }}
                t={t}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
