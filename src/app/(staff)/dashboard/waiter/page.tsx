'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { useServiceRequests } from '@/hooks/use-service-requests'
import { Table as TableType, Employee, Order } from '@/types/database'
import { TableCard } from '@/components/waiter/table-card'
import { ServiceRequestCard } from '@/components/waiter/service-request-card'
import { EmptyState } from '@/components/shared/empty-state'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table2, Bell, ShoppingBag, Clock } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

export default function WaiterDashboardPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { requests, updateStatus } = useServiceRequests(profile?.restaurant_id)
  const [tables, setTables] = useState<TableType[]>([])
  const [orders, setOrders] = useState<(Order & { table?: TableType })[]>([])
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.restaurant_id || !profile?.id) return
    const supabase = createClient()

    supabase.from('employees').select('*').eq('profile_id', profile.id).single()
      .then(async ({ data }) => {
        if (data) {
          setEmployee(data as Employee)
          const { data: tablesData } = await supabase.from('tables').select('*').eq('assigned_waiter_id', data.id).order('table_number')
          if (tablesData) {
            const assignedTables = tablesData as TableType[]
            setTables(assignedTables)
            const tableIds = assignedTables.map(t => t.id)
            if (tableIds.length > 0) {
              const { data: ordersData } = await supabase
                .from('orders')
                .select('*, table:tables(*)')
                .in('table_id', tableIds)
                .not('status', 'in', '("completed","cancelled")')
                .order('created_at', { ascending: false })
              if (ordersData) setOrders(ordersData as unknown as (Order & { table?: TableType })[])
            }
          }
          setLoading(false)
        } else {
          setLoading(false)
        }
      })
  }, [profile?.restaurant_id, profile?.id])

  const pendingRequests = requests.filter(r => r.status === 'pending' || r.status === 'acknowledged')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t('nav.waiter')} {t('dashboard.title')}</h1>
        <p className="text-muted-foreground">{employee?.full_name || 'Welcome'}</p>
      </div>

      <Tabs defaultValue="tables">
        <TabsList>
          <TabsTrigger value="tables" className="gap-2">
            <Table2 className="h-4 w-4" />{t('waiter.assignedTables')} ({tables.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingBag className="h-4 w-4" />Current Orders ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="requests" className="gap-2">
            <Bell className="h-4 w-4" />{t('waiter.activeRequests')} ({pendingRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tables" className="mt-4">
          {tables.length === 0 ? (
            <EmptyState icon={<Table2 className="h-8 w-8" />} title="No assigned tables" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map((table) => (
                <TableCard key={table.id} table={table} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          {orders.length === 0 ? (
            <EmptyState icon={<ShoppingBag className="h-8 w-8" />} title="No current orders" description="Orders from your tables will appear here" />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {orders.map((order) => (
                <Card key={order.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Table {order.table?.table_number}</span>
                        <Badge variant={order.status === 'pending' ? 'default' : order.status === 'preparing' ? 'secondary' : 'outline'}>
                          {order.status}
                        </Badge>
                      </div>
                      <span className="text-sm font-semibold">{formatCurrency(order.total_amount)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {new Date(order.created_at).toLocaleTimeString()}
                    </div>
                    {order.customer_name && (
                      <p className="text-sm text-muted-foreground">{order.customer_name}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="requests" className="mt-4 space-y-3">
          {pendingRequests.length === 0 ? (
            <EmptyState icon={<Bell className="h-8 w-8" />} title="No active requests" description="All clear!" />
          ) : (
            pendingRequests.map((req) => (
              <ServiceRequestCard
                key={req.id}
                request={req}
                onAcknowledge={(id) => updateStatus(id, 'acknowledged')}
                onResolve={(id) => updateStatus(id, 'resolved')}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
