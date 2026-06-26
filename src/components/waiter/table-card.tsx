'use client'

import { useLanguage } from '@/hooks/use-language'
import { Table as TableType } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TABLE_STATUS_COLORS } from '@/lib/constants'
import { Users } from 'lucide-react'

interface TableCardProps {
  table: TableType
  onClick?: (table: TableType) => void
}

export function TableCard({ table, onClick }: TableCardProps) {
  const { t } = useLanguage()

  return (
    <Card
      data-testid="table-card"
      className="cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onClick?.(table)}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">Table {table.table_number}</h3>
            <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
              <Users className="h-3 w-3" />
              <span>Capacity: {table.capacity}</span>
            </div>
          </div>
          <Badge className={TABLE_STATUS_COLORS[table.status]}>
            {table.status}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
