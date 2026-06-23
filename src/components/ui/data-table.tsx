'use client'

import * as React from 'react'
import { cn } from '@/lib/utils/cn'
import { useLanguage } from '@/hooks/use-language'

interface Column {
  key: string
  header: string
  render?: (item: Record<string, unknown>) => React.ReactNode
  className?: string
}

interface DataTableProps {
  columns: Column[]
  data: Record<string, unknown>[]
  loading?: boolean
  onRowClick?: (item: Record<string, unknown>) => void
}

export function DataTable({ columns, data, loading, onRowClick }: DataTableProps) {
  const { t } = useLanguage()
  if (loading) {
    return (
      <div className="rounded-lg border overflow-hidden">
        <div className="divide-y divide-border/50">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              {columns.map((col) => (
                <div key={col.key} className="h-5 bg-gradient-to-r from-muted via-muted/80 to-muted bg-[length:200%_100%] animate-skeleton rounded flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center">
        <p className="text-sm text-muted-foreground">{t('table.empty')}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border overflow-hidden bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30">
              {columns.map((col) => (
                <th key={col.key} className={cn('px-4 py-3.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider', col.className)}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {data.map((item, index) => (
              <tr
                key={(item.id as string) || index}
                className={cn(
                  'transition-colors duration-150',
                  onRowClick ? 'cursor-pointer hover:bg-muted/40' : 'hover:bg-muted/20'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className={cn('px-4 py-3.5 text-sm', col.className)}>
                    {col.render ? col.render(item) : String(item[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export type { Column, DataTableProps }
