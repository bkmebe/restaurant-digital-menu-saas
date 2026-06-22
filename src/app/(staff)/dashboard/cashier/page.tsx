'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { Order } from '@/types/database'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import { DollarSign } from 'lucide-react'

export default function CashierDashboardPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  const fetchOrders = async () => {
    if (!profile?.restaurant_id) return
    const supabase = createClient()
    const { data } = await supabase
      .from('orders')
      .select('*, items:order_items(*), table:tables(*)')
      .eq('restaurant_id', profile.restaurant_id)
      .neq('status', 'paid')
      .order('created_at', { ascending: false })
    if (data) setOrders(data as unknown as Order[])
    setLoading(false)
  }

  useEffect(() => { fetchOrders() }, [profile?.restaurant_id])

  const markAsPaid = async (orderId: string) => {
    const supabase = createClient()
    await supabase.from('orders').update({ status: 'paid' }).eq('id', orderId)
    await fetchOrders()
  }

  const columns: Column[] = [
    { key: 'created_at', header: 'Time', render: (o: Record<string, unknown>) => formatDateTime(o.created_at as string) },
    { key: 'table', header: 'Table', render: (o: Record<string, unknown>) => `Table ${((o.table as { table_number: number })?.table_number) || '-'}` },
    { key: 'customer_name', header: 'Customer', render: (o: Record<string, unknown>) => (o.customer_name as string) || 'Guest' },
    { key: 'items', header: 'Items', render: (o: Record<string, unknown>) => (o.items as Array<{ quantity: number; menu_item: { name: string } }>)?.map(i => `${i.quantity}x ${i.menu_item?.name}`).join(', ') || '-' },
    { key: 'total_amount', header: 'Total', render: (o: Record<string, unknown>) => <span className="font-bold">{formatCurrency(Number(o.total_amount))}</span> },
    { key: 'status', header: 'Status', render: (o: Record<string, unknown>) => <StatusBadge status={o.status as string} mapping={{ open: 'info', preparing: 'warning', served: 'success', paid: 'default' }} /> },
    { key: 'actions', header: '', render: (o: Record<string, unknown>) => (o.status as string) !== 'paid' ? (
      <Button size="sm" onClick={() => markAsPaid(o.id as string)}>
        <DollarSign className="h-3 w-3 mr-1" />{t('cashier.markAsPaid')}
      </Button>
    ) : null },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('nav.cashier')} {t('dashboard.title')}</h1>
      <DataTable columns={columns} data={orders as unknown as Record<string, unknown>[]} loading={loading} />
    </div>
  )
}
