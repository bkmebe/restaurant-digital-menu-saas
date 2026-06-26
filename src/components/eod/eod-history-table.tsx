'use client'

import { useEffect } from 'react'
import { useEODHistory } from '@/hooks/use-eod'
import { useLanguage } from '@/hooks/use-language'
import { useAuth } from '@/hooks/use-auth'
import { DataTable, type Column } from '@/components/ui/data-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Search, CalendarDays } from 'lucide-react'

interface EODHistoryTableProps {
  onSelect?: (id: string) => void
}

const STATUS_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'info'> = {
  open: 'info',
  closing: 'warning',
  closed: 'warning',
  approved: 'success',
  reopened: 'warning',
}

export function EODHistoryTable({ onSelect }: EODHistoryTableProps) {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { data, total, loading, fetchHistory } = useEODHistory()

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchHistory()
    }
  }, [profile?.restaurant_id, fetchHistory])

  const columns: Column[] = [
    {
      key: 'business_date',
      header: t('common.date'),
      render: (item) => new Date(item.business_date as string).toLocaleDateString(),
    },
    {
      key: 'status',
      header: t('common.status'),
      render: (item) => (
        <Badge variant={STATUS_VARIANTS[item.status as string] || 'default'}>
          {t(`eod.status.${item.status as string}`)}
        </Badge>
      ),
    },
    {
      key: 'total_orders',
      header: t('eod.totalOrders'),
    },
    {
      key: 'total_sales',
      header: t('eod.totalSales'),
      render: (item) => `ETB ${(item.total_sales as number).toLocaleString()}`,
    },
    {
      key: 'discrepancy_amount',
      header: t('reconciliation.discrepancy'),
      render: (item) => {
        const val = item.discrepancy_amount as number
        return (
          <span className={val === 0 ? '' : val > 0 ? 'text-emerald-600' : 'text-red-600'}>
            {val >= 0 ? '+' : ''}{val.toLocaleString()}
          </span>
        )
      },
    },
    {
      key: 'closed_at',
      header: t('eod.closedAt'),
      render: (item) => item.closed_at ? new Date(item.closed_at as string).toLocaleString() : '-',
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <select
            className="h-10 w-full rounded-lg border border-input bg-background pl-10 pr-4 text-sm"
            onChange={(e) => fetchHistory({ status: e.target.value || undefined })}
          >
            <option value="">{t('eod.allStatuses')}</option>
            <option value="open">{t('eod.status.open')}</option>
            <option value="closed">{t('eod.status.closed')}</option>
            <option value="approved">{t('eod.status.approved')}</option>
            <option value="reopened">{t('eod.status.reopened')}</option>
          </select>
        </div>
        <Button variant="outline" size="sm" onClick={() => fetchHistory()} className="gap-2">
          <CalendarDays className="h-4 w-4" />
          {t('common.refresh')}
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={data as unknown as Record<string, unknown>[]}
        loading={loading}
        onRowClick={onSelect ? (item) => onSelect(item.id as string) : undefined}
      />

      <p className="text-xs text-muted-foreground">
        {t('common.total')}: {total}
      </p>
    </div>
  )
}
