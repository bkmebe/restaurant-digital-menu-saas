'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatCurrency } from '@/lib/utils/format'
import { TrendingUp, DollarSign, UtensilsCrossed, Clock, Users, Wallet, BarChart3, Building2 } from 'lucide-react'

interface PayrollSummary {
  totalSalary: number
  totalBonuses: number
  totalDeductions: number
  netPay: number
  employeeCount: number
  pendingCount: number
}

interface OrderTrend {
  date: string
  count: number
  revenue: number
}

interface BranchPerf {
  id: string
  name: string
  orderCount: number
  revenue: number
}

export default function ManagerDashboardPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    todayRevenue: 0,
    monthRevenue: 0,
    totalOrders: 0,
    popularItems: [] as { name: string; count: number; revenue: number }[],
  })
  const [payroll, setPayroll] = useState<PayrollSummary | null>(null)
  const [trends, setTrends] = useState<OrderTrend[]>([])
  const [branches, setBranches] = useState<BranchPerf[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.restaurant_id) { setLoading(false); return }
    loadData()
  }, [profile?.restaurant_id])

  async function loadData() {
    const supabase = createClient()
    const rid = profile?.restaurant_id

    const today = new Date()
    const curMonth = today.getMonth()
    const curYear = today.getFullYear()

    const [ordersResult, popularResult, payrollResult, branchResult] = await Promise.all([
      supabase.from('orders').select('total_amount, created_at, status, restaurant_id').eq('restaurant_id', rid),
      supabase.rpc('get_popular_items', { rest_id: rid }),
      supabase.from('payrolls').select('salary, bonuses, deductions, net_pay, status, employee_id').eq('restaurant_id', rid).eq('month', curMonth + 1).eq('year', curYear),
      supabase.from('branches').select('id, name, restaurants!inner(id, name)').eq('organization_id', profile?.organization_id ?? ''),
    ])

    const orders = (ordersResult.data || []) as Array<{ total_amount: number; created_at: string; status: string; restaurant_id: string }>
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const monthStart = new Date(curYear, curMonth, 1)

    setStats({
      todayRevenue: orders.filter(o => new Date(o.created_at) >= todayStart).reduce((sum, o) => sum + Number(o.total_amount), 0),
      monthRevenue: orders.filter(o => new Date(o.created_at) >= monthStart).reduce((sum, o) => sum + Number(o.total_amount), 0),
      totalOrders: orders.length,
      popularItems: (popularResult.data || []) as { name: string; count: number; revenue: number }[],
    })

    const payrollData = (payrollResult.data || []) as Array<{ salary: number; bonuses: number; deductions: number; net_pay: number; status: string; employee_id: string }>
    setPayroll({
      totalSalary: payrollData.reduce((s, p) => s + Number(p.salary), 0),
      totalBonuses: payrollData.reduce((s, p) => s + Number(p.bonuses), 0),
      totalDeductions: payrollData.reduce((s, p) => s + Number(p.deductions), 0),
      netPay: payrollData.reduce((s, p) => s + Number(p.net_pay), 0),
      employeeCount: payrollData.length,
      pendingCount: payrollData.filter(p => p.status === 'pending').length,
    })

    const branchData = (branchResult.data || []) as Array<{ id: string; name: string; restaurants: Array<{ id: string; name: string }> }>
    const branchRevenues: Record<string, { orderCount: number; revenue: number }> = {}
    for (const branch of branchData) {
      const restaurantIds = branch.restaurants.map(r => r.id)
      const branchOrders = orders.filter(o => restaurantIds.includes(o.restaurant_id))
      branchRevenues[branch.id] = {
        orderCount: branchOrders.length,
        revenue: branchOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
      }
    }
    setBranches(branchData.map(b => ({
      id: b.id,
      name: b.name,
      orderCount: branchRevenues[b.id]?.orderCount ?? 0,
      revenue: branchRevenues[b.id]?.revenue ?? 0,
    })))

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date()
      d.setDate(d.getDate() - (6 - i))
      return d.toISOString().slice(0, 10)
    })

    const dailyTrends = last7Days.map(date => {
      const dayOrders = orders.filter(o => o.created_at.slice(0, 10) === date)
      return {
        date,
        count: dayOrders.length,
        revenue: dayOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
      }
    })
    setTrends(dailyTrends)
    setLoading(false)
  }

  if (loading) return <LoadingSpinner size="lg" />

  const revenueCards = [
    { title: t('dashboard.today') + ' Revenue', value: formatCurrency(stats.todayRevenue), icon: DollarSign, color: 'bg-green-500' },
    { title: t('dashboard.thisMonth') + ' Revenue', value: formatCurrency(stats.monthRevenue), icon: TrendingUp, color: 'bg-blue-500' },
    { title: t('manager.totalOrders'), value: String(stats.totalOrders), icon: Clock, color: 'bg-purple-500' },
    { title: t('manager.avgOrderValue'), value: stats.totalOrders > 0 ? formatCurrency(stats.monthRevenue / stats.totalOrders) : 'ETB 0', icon: Wallet, color: 'bg-amber-500' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('manager.revenueOverview')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {revenueCards.map((card) => {
          const Icon = card.icon
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center gap-3 pb-2">
                <div className={`p-2 rounded-lg ${card.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              {t('manager.sevenDayTrends')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {trends.map((day) => (
                <div key={day.date} className="flex items-center justify-between py-1.5 border-b last:border-0">
                  <span className="text-sm text-muted-foreground">
                    {new Date(day.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">{t('manager.ordersCount', { count: day.count })}</span>
                    <span className="text-sm font-medium w-24 text-right">{formatCurrency(day.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-amber-500" />
              {t('manager.popularItems')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {stats.popularItems.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">{t('manager.noData')}</p>
            ) : (
              <div className="space-y-2">
                {stats.popularItems.slice(0, 10).map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground w-4">#{i + 1}</span>
                      <span className="text-sm font-medium">{item.name}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span>{t('manager.sold', { count: item.count })}</span>
                      <span className="font-medium text-foreground">{formatCurrency(item.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {payroll && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-500" />
              {t('manager.payrollSummary')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{t('manager.employees')}</p>
                <p className="text-lg font-bold">{payroll.employeeCount}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{t('manager.totalSalary')}</p>
                <p className="text-lg font-bold">{formatCurrency(payroll.totalSalary)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{t('manager.bonuses')}</p>
                <p className="text-lg font-bold text-green-600">{formatCurrency(payroll.totalBonuses)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{t('manager.deductions')}</p>
                <p className="text-lg font-bold text-red-600">{formatCurrency(payroll.totalDeductions)}</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">{t('manager.netPay')}</p>
                <p className="text-lg font-bold">{formatCurrency(payroll.netPay)}</p>
              </div>
            </div>
            {payroll.pendingCount > 0 && (
              <div className="mt-4 flex items-center gap-2 text-sm text-amber-600">
                <Clock className="h-4 w-4" />
                {t('manager.pendingPayroll', { count: payroll.pendingCount })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {branches.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-indigo-500" />
              {t('manager.branchPerformance')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {branches.map((branch) => (
                <div key={branch.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{branch.name}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{t('manager.ordersCount', { count: branch.orderCount })}</span>
                    <span className="font-medium text-foreground w-28 text-right">{formatCurrency(branch.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
