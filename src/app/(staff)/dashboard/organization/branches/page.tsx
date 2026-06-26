'use client'

import { useLanguage } from '@/hooks/use-language'
import { useOrganizationBranches } from '@/hooks/use-organization-analytics'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { BranchPerformanceTable } from '@/components/organization/branch-performance-table'
import { BranchComparisonChart } from '@/components/organization/branch-comparison-chart'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/format'
import { Building2, DollarSign, ShoppingCart, Award } from 'lucide-react'

export default function OrganizationBranchesPage() {
  const { t } = useLanguage()
  const { data, loading, error, refetch } = useOrganizationBranches()

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
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Building2 className="h-3.5 w-3.5" />
              {t('organization.branchesBadge')}
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('organization.branchesTitle')}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              {t('organization.branchesSubtitle')}
            </p>
          </div>
        </div>
      </section>

      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Building2 className="h-4 w-4 text-indigo-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('organization.totalBranches')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.summary.totalBranches}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('organization.totalRevenue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(data.summary.totalRevenue)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <ShoppingCart className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('organization.totalOrders')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{data.summary.totalOrders}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Award className="h-4 w-4 text-amber-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('organization.topBranch')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-lg font-bold truncate">{data.summary.topBranch?.name || '-'}</p>
              <p className="text-xs text-muted-foreground">
                {data.summary.topBranch ? formatCurrency(data.summary.topBranch.totalRevenue) : ''}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <BranchComparisonChart
          branches={(data?.branches || []).map(b => ({ id: b.id, name: b.name, revenue: b.totalRevenue, orders: b.totalOrders, avgOrderValue: b.avgOrderValue, tablesServed: 0, monthRevenue: b.monthRevenue }))}
          t={t}
        />
        <div className="lg:col-span-2">
          <BranchPerformanceTable branches={data?.branches || []} t={t} />
        </div>
      </div>
    </div>
  )
}
