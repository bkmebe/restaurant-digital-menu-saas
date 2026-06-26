'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserCircle, X } from 'lucide-react'

interface TableWithWaiter {
  id: string
  table_number: number
  capacity: number
  status: 'available' | 'occupied' | 'cleaning'
  assigned_waiter_id: string | null
  waiter_name?: string
}

interface Employee {
  id: string
  full_name: string
}

interface TableAssignmentViewProps {
  tables: TableWithWaiter[]
  waiters: Employee[]
  loading: boolean
  error: string | null
  onAssign: (tableId: string, waiterId: string | null) => Promise<boolean>
  onUnassign: (tableId: string) => Promise<boolean>
}

export function TableAssignmentView({ tables, waiters, loading, error, onAssign, onUnassign }: TableAssignmentViewProps) {
  const { t } = useLanguage()
  const [assigningId, setAssigningId] = useState<string | null>(null)

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="h-24 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive mb-2">{error}</p>
        <p className="text-sm text-muted-foreground">{t('tableAssignment.retry')}</p>
      </div>
    )
  }

  const unassigned = tables.filter(t => !t.assigned_waiter_id)

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('tableAssignment.byTable')}</CardTitle>
        </CardHeader>
        <CardContent>
          {tables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">{t('tableAssignment.noTables')}</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {tables.map(table => {
                const isOccupied = table.status === 'occupied'
                return (
                  <Card key={table.id} className={`${isOccupied ? 'ring-1 ring-primary/20' : ''}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-sm">{t('table.number', { number: table.table_number })}</p>
                          <p className="text-xs text-muted-foreground">{t('tableAssignment.capacity', { count: table.capacity })}</p>
                        </div>
                        <Badge variant={isOccupied ? 'default' : table.status === 'cleaning' ? 'secondary' : 'outline'}>
                          {isOccupied ? t('table.occupied') : table.status === 'cleaning' ? t('tableAssignment.cleaning') : t('table.available')}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          className="flex-1 h-8 text-xs rounded-md border border-input bg-background px-2"
                          value={table.assigned_waiter_id || ''}
                          onChange={async (e) => {
                            const val = e.target.value
                            setAssigningId(table.id)
                            await onAssign(table.id, val || null)
                            setAssigningId(null)
                          }}
                          disabled={assigningId === table.id}
                        >
                          <option value="">{t('tableAssignment.noWaiter')}</option>
                          {waiters.map(w => (
                            <option key={w.id} value={w.id}>{w.full_name}</option>
                          ))}
                        </select>
                        {table.assigned_waiter_id && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onUnassign(table.id)}
                            disabled={assigningId === table.id}
                          >
                            <X className="h-3 w-3 text-muted-foreground" />
                          </Button>
                        )}
                      </div>
                      {table.waiter_name && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <UserCircle className="h-3 w-3" />
                          {table.waiter_name}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {waiters.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">{t('tableAssignment.byWaiter')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {waiters.map(waiter => {
            const assigned = tables.filter(tbl => tbl.assigned_waiter_id === waiter.id)
            return (
              <Card key={waiter.id}>
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <UserCircle className="h-4 w-4 text-muted-foreground" />
                    {waiter.full_name}
                    <Badge variant="outline" className="ml-auto text-xs">{assigned.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-2">
                  {assigned.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t('tableAssignment.noTablesAssigned')}</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {assigned.map(tbl => (
                        <Badge key={tbl.id} variant={tbl.status === 'occupied' ? 'default' : 'secondary'} className="text-xs">
                          {t('table.number', { number: tbl.table_number })}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
          </div>
        </div>
      )}

      {unassigned.length > 0 && (
        <Card className="border-dashed">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              {t('tableAssignment.unassigned')} ({unassigned.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            <div className="flex flex-wrap gap-1">
              {unassigned.map(tbl => (
                <Badge key={tbl.id} variant="outline" className="text-xs">
                  {t('table.number', { number: tbl.table_number })}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
