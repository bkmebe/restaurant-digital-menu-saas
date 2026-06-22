'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency } from '@/lib/utils/format'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  BarChart3, TrendingUp, Users, Table2, DollarSign, ShoppingCart,
  RefreshCw, ChefHat, Star,
} from 'lucide-react'

interface DailySale {
  date: string
  order_count: number
  tables_served: number
  revenue: number
  avg_order_value: number
}

interface MenuPerf {
  menu_item_id: string
  name: string
  price: number
  category_name: string
  order_count: number
  total_quantity: number
  total_revenue: number
}

interface StaffPerf {
  profile_id: string
  full_name: string
  role: string
  orders_handled: number
  tables_served: number
  revenue_generated: number
  avg_order_value: number
}

interface TableUtil {
  table_id: string
  table_number: number
  capacity: number
  total_orders: number
  active_days: number
  avg_dining_minutes: number
}

export default function ReportsPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [dailySales, setDailySales] = useState<DailySale[]>([])
  const [menuPerf, setMenuPerf] = useState<MenuPerf[]>([])
  const [staffPerf, setStaffPerf] = useState<StaffPerf[]>([])
  const [tableUtil, setTableUtil] = useState<TableUtil[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    if (!profile?.restaurant_id) { setLoading(false); return }
    const supabase = createClient()
    const rid = profile.restaurant_id

    const [dailyResult, menuResult, staffResult, tableResult] = await Promise.all([
      supabase.from('mv_daily_sales').select('*').eq('restaurant_id', rid).order('date', { ascending: false }).limit(30),
      supabase.from('mv_menu_performance').select('*').eq('restaurant_id', rid).order('total_revenue', { ascending: false }).limit(20),
      supabase.from('mv_staff_performance').select('*').eq('restaurant_id', rid).order('orders_handled', { ascending: false }),
      supabase.from('mv_table_utilization').select('*').eq('restaurant_id', rid).order('table_number'),
    ])

    if (dailyResult.data) setDailySales(dailyResult.data as DailySale[])
    if (menuResult.data) setMenuPerf(menuResult.data as MenuPerf[])
    if (staffResult.data) setStaffPerf(staffResult.data as StaffPerf[])
    if (tableResult.data) setTableUtil(tableResult.data as TableUtil[])
    setLoading(false)
  }, [profile?.restaurant_id])

  useEffect(() => { loadData() }, [loadData])

  const refreshData = async () => {
    if (!profile?.restaurant_id) return
    setRefreshing(true)
    const supabase = createClient()
    await supabase.rpc('refresh_analytics_views')
    await loadData()
    setRefreshing(false)
  }

  if (loading) return <LoadingSpinner size="lg" />

  const totalRevenue = dailySales.reduce((s, d) => s + Number(d.revenue), 0)
  const totalOrders = dailySales.reduce((s, d) => s + d.order_count, 0)
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const totalStaff = staffPerf.length

  const summaryCards = [
    { title: 'Total Revenue (30d)', value: formatCurrency(totalRevenue), icon: DollarSign, color: 'from-emerald-500/20 to-emerald-500/5', iconBg: 'bg-emerald-500/15 text-emerald-600' },
    { title: 'Orders Processed', value: String(totalOrders), icon: ShoppingCart, color: 'from-blue-500/20 to-blue-500/5', iconBg: 'bg-blue-500/15 text-blue-600' },
    { title: 'Avg Order Value', value: formatCurrency(avgOrderValue), icon: TrendingUp, color: 'from-violet-500/20 to-violet-500/5', iconBg: 'bg-violet-500/15 text-violet-600' },
    { title: 'Active Staff', value: String(totalStaff), icon: Users, color: 'from-amber-500/20 to-amber-500/5', iconBg: 'bg-amber-500/15 text-amber-600' },
  ]

  const chartData = [...dailySales].reverse()

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 className="h-6 w-6" />
          Reports
        </h1>
        <Button variant="outline" size="sm" onClick={refreshData} disabled={refreshing} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh data'}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {summaryCards.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.title} className="relative overflow-hidden border-border/60 bg-card/70 shadow-sm backdrop-blur-sm">
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.color}`} />
              <CardContent className="relative space-y-2 p-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-muted-foreground">{item.title}</p>
                <p className="text-lg font-semibold leading-tight tracking-tight">{item.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5 text-emerald-500" />
            Daily Sales (Last 30 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <EmptyState icon={<BarChart3 className="h-8 w-8" />} title="No sales data yet" />
          ) : (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      const d = new Date(v + 'T00:00:00')
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ fontSize: 13 }} />
                  <Bar dataKey="revenue" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/85 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-amber-500" />
              Top Menu Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {menuPerf.length === 0 ? (
              <EmptyState icon={<Star className="h-8 w-8" />} title="No menu data yet" />
            ) : (
              <div className="space-y-1">
                {menuPerf.slice(0, 10).map((item, i) => (
                  <div key={item.menu_item_id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.category_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                      <span>{item.total_quantity} sold</span>
                      <span className="w-20 text-right font-medium text-foreground">{formatCurrency(item.total_revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/85 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-blue-500" />
              Staff Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            {staffPerf.length === 0 ? (
              <EmptyState icon={<Users className="h-8 w-8" />} title="No staff data yet" />
            ) : (
              <div className="space-y-1">
                {staffPerf.map((staff) => (
                  <div key={staff.profile_id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {staff.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-medium">{staff.full_name}</p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{staff.role}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                      <span>{staff.orders_handled} orders</span>
                      <span className="w-20 text-right font-medium text-foreground">{formatCurrency(staff.revenue_generated)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/85 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Table2 className="h-5 w-5 text-purple-500" />
            Table Utilization
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tableUtil.length === 0 ? (
            <EmptyState icon={<Table2 className="h-8 w-8" />} title="No table data yet" />
          ) : (
            <div className="space-y-1">
              {tableUtil.map((table) => (
                <div key={table.table_id} className="flex items-center justify-between rounded-lg px-2 py-2 text-sm transition-colors hover:bg-muted/50">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-muted text-xs font-medium">
                      {table.table_number}
                    </span>
                    <span className="font-medium">Table {table.table_number}</span>
                    <span className="text-xs text-muted-foreground">Capacity: {table.capacity}</span>
                  </div>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <span>{table.total_orders} orders</span>
                    <span>{table.active_days} active days</span>
                    <span className="font-medium text-foreground">{table.avg_dining_minutes} min avg</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
