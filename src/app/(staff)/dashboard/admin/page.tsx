'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { EmptyState } from '@/components/shared/empty-state'
import { formatCurrency, formatDateTime } from '@/lib/utils/format'
import Link from 'next/link'
import {
  ArrowUpRight,
  ChefHat,
  CreditCard,
  Table2,
  Users,
  UtensilsCrossed,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  Clock,
  Star,
  Activity,
  Wallet,
  TrendingUp,
  Percent,
} from 'lucide-react'

interface DashboardStats {
  todayOrders: number
  todayRevenue: number
  activeTables: number
  totalTables: number
  employeeCount: number
  lowStockCount: number
  menuItemCount: number
  pendingPayments: number
}

interface PopularItem {
  name: string
  total_quantity: number
  total_revenue: number
}

interface RecentActivity {
  id: string
  action: string
  table_name: string
  created_at: string
}

export default function AdminDashboardPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [popularItems, setPopularItems] = useState<PopularItem[]>([])
  const [activities, setActivities] = useState<RecentActivity[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.restaurant_id) { setLoading(false); return }
    loadData()
  }, [profile?.restaurant_id])

  async function loadData() {
    const supabase = createClient()
    const rid = profile?.restaurant_id

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString()

    const [
      ordersResult,
      tablesResult,
      employeesResult,
      menuResult,
      lowStockResult,
      popularResult,
      activitiesResult,
    ] = await Promise.all([
      supabase.from('orders').select('id, total_amount, status, created_at').eq('restaurant_id', rid),
      supabase.from('tables').select('id, status').eq('restaurant_id', rid),
      supabase.from('employees').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid).eq('is_active', true),
      supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid),
      supabase.from('low_stock_alerts').select('id', { count: 'exact', head: true }).eq('restaurant_id', rid).eq('is_resolved', false),
      supabase.rpc('get_popular_items', { rest_id: rid }),
      supabase.from('audit_logs').select('id, action, table_name, created_at').eq('restaurant_id', rid).order('created_at', { ascending: false }).limit(10),
    ])

    const orders = (ordersResult.data || []) as Array<{ id: string; total_amount: number; status: string; created_at: string }>
    const todayOrdersList = orders.filter(o => o.created_at >= todayStr)
    const pendingPayments = orders.filter(o => ['pending', 'accepted', 'preparing', 'ready', 'delivered'].includes(o.status))

    setStats({
      todayOrders: todayOrdersList.length,
      todayRevenue: todayOrdersList.reduce((sum, o) => sum + Number(o.total_amount), 0),
      activeTables: ((tablesResult.data || []) as Array<{ status: string }>).filter(t => t.status === 'occupied').length,
      totalTables: ((tablesResult.data || []) as Array<unknown>).length,
      employeeCount: employeesResult.count || 0,
      lowStockCount: (lowStockResult.data || []).length,
      menuItemCount: menuResult.count || 0,
      pendingPayments: pendingPayments.length,
    })

    setPopularItems((popularResult.data || []) as PopularItem[])
    setActivities((activitiesResult.data || []) as RecentActivity[])
    setLoading(false)
  }

  if (loading) return <LoadingSpinner size="lg" />

  const avgOrderValue = stats?.todayOrders ? stats.todayRevenue / stats.todayOrders : 0

  const statCards = [
    {
      label: "Today's Revenue",
      value: formatCurrency(stats?.todayRevenue ?? 0),
      trend: `${stats?.todayOrders ?? 0} orders`,
      icon: DollarSign,
      accent: 'from-emerald-500/20 to-emerald-500/5',
      iconBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    },
    {
      label: 'Pending Payments',
      value: String(stats?.pendingPayments ?? 0),
      trend: 'awaiting settlement',
      icon: Wallet,
      accent: 'from-amber-500/20 to-amber-500/5',
      iconBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    },
    {
      label: 'Active Staff',
      value: String(stats?.employeeCount ?? 0),
      trend: `${stats?.menuItemCount ?? 0} menu items`,
      icon: Users,
      accent: 'from-blue-500/20 to-blue-500/5',
      iconBg: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
    },
    {
      label: 'Tables',
      value: `${(stats?.totalTables ?? 0) - (stats?.activeTables ?? 0)}/${stats?.totalTables ?? 0}`,
      trend: `${stats?.activeTables ?? 0} occupied`,
      icon: Table2,
      accent: 'from-violet-500/20 to-violet-500/5',
      iconBg: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
    },
    {
      label: 'Low Stock Alerts',
      value: String(stats?.lowStockCount ?? 0),
      trend: stats?.lowStockCount ? 'Needs attention' : 'All good',
      icon: AlertTriangle,
      accent: stats?.lowStockCount ? 'from-red-500/20 to-red-500/5' : 'from-green-500/20 to-green-500/5',
      iconBg: stats?.lowStockCount ? 'bg-red-500/15 text-red-600 dark:text-red-400' : 'bg-green-500/15 text-green-600 dark:text-green-400',
    },
    {
      label: 'Avg Order Value',
      value: formatCurrency(avgOrderValue),
      trend: 'per order today',
      icon: TrendingUp,
      accent: 'from-sky-500/20 to-sky-500/5',
      iconBg: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
    },
  ]

  const sections = [
    {
      title: t('admin.menuManagement'),
      href: '/dashboard/admin/menu',
      icon: UtensilsCrossed,
      description: 'Curate categories, pricing, and availability for a polished guest experience.',
      tone: 'from-indigo-500/15 to-blue-500/10',
      iconTone: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-300',
    },
    {
      title: t('admin.employeeManagement'),
      href: '/dashboard/admin/employees',
      icon: Users,
      description: 'Maintain role coverage and staffing quality across every shift.',
      tone: 'from-emerald-500/15 to-teal-500/10',
      iconTone: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
    },
    {
      title: t('admin.tableManagement'),
      href: '/dashboard/admin/tables',
      icon: Table2,
      description: 'Organize floor readiness and seating configuration with confidence.',
      tone: 'from-violet-500/15 to-fuchsia-500/10',
      iconTone: 'bg-violet-500/15 text-violet-600 dark:text-violet-300',
    },
    {
      title: t('admin.paymentSettings'),
      href: '/dashboard/admin/payments',
      icon: CreditCard,
      description: 'Control providers and settlement setup in one secure workspace.',
      tone: 'from-amber-500/20 to-orange-500/10',
      iconTone: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
    },
  ]

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <ChefHat className="h-3.5 w-3.5" />
              Premium Operations Console
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {t('nav.admin')} {t('dashboard.title')}
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Real-time overview of your restaurant operations.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {statCards.map((item) => {
          const Icon = item.icon
          return (
            <Card key={item.label} className="relative overflow-hidden border-border/60 bg-card/70 shadow-sm backdrop-blur-sm transition-all duration-200 hover:shadow-md">
              <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${item.accent}`} />
              <CardContent className="relative space-y-2 p-4">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${item.iconBg}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-semibold leading-tight tracking-tight">{item.value}</p>
                  <p className="text-xs text-muted-foreground/80">{item.trend}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <section className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Management Workspace</h2>
            <p className="text-sm text-muted-foreground">Choose an area to maintain daily operations.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {sections.map((section) => {
            const Icon = section.icon
            return (
              <Link key={section.href} href={section.href} className="group">
                <Card className="h-full overflow-hidden rounded-2xl border-border/60 bg-card/85 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                  <CardHeader className="space-y-4 pb-2">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${section.iconTone}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-1.5">
                      <CardTitle className="text-base font-semibold tracking-tight">{section.title}</CardTitle>
                      <p className="text-sm leading-relaxed text-muted-foreground">{section.description}</p>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2">
                    <div className="flex items-center justify-between rounded-xl border border-border/60 bg-gradient-to-r p-3 text-sm font-medium group-hover:border-primary/30">
                      <span>Open module</span>
                      <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </div>
                  </CardContent>
                  <div className={`h-1 w-full bg-gradient-to-r ${section.tone}`} />
                </Card>
              </Link>
            )
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/85 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Star className="h-5 w-5 text-amber-500" />
              Popular Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {popularItems.length === 0 ? (
              <EmptyState icon={<Star className="h-8 w-8" />} title="No orders yet" />
            ) : (
              <div className="space-y-1">
                {popularItems.slice(0, 8).map((item, i) => (
                  <div key={i} className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
                        {i + 1}
                      </span>
                      <span className="font-medium text-sm">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{item.total_quantity} sold</span>
                      <span className="font-medium text-foreground">{formatCurrency(item.total_revenue)}</span>
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
              <Activity className="h-5 w-5 text-blue-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activities.length === 0 ? (
              <EmptyState icon={<Activity className="h-8 w-8" />} title="No recent activity" />
            ) : (
              <div className="max-h-[400px] space-y-1 overflow-y-auto">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-muted/50">
                    <div className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-md bg-muted">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">{activity.action}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">{activity.table_name}</Badge>
                        <span className="text-xs text-muted-foreground">{formatDateTime(activity.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
