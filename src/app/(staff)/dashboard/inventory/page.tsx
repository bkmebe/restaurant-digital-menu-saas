'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLowStockAlerts, useStockItems, usePurchaseOrders } from '@/hooks/use-inventory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { WastageRecord } from '@/types/inventory'
import Link from 'next/link'
import { Package, AlertTriangle, Truck, ShoppingCart, TrendingDown, Trash2, ArrowRight } from 'lucide-react'

export default function InventoryDashboardPage() {
  const { profile } = useAuth()
  const { stock, loading: stockLoading } = useStockItems(profile?.restaurant_id)
  const { alerts } = useLowStockAlerts(profile?.restaurant_id)
  const { orders: purchases } = usePurchaseOrders(profile?.restaurant_id)
  const [wastage, setWastage] = useState<(WastageRecord & { ingredient?: { name: string } })[]>([])
  const [loadingWastage, setLoadingWastage] = useState(true)

  useEffect(() => {
    if (!profile?.restaurant_id) return
    const supabase = createClient()
    supabase.from('wastage_records')
      .select('*, ingredient:ingredients(name)')
      .eq('restaurant_id', profile.restaurant_id)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => {
        if (data) setWastage(data as unknown as (WastageRecord & { ingredient?: { name: string } })[])
        setLoadingWastage(false)
      })
  }, [profile?.restaurant_id])

  const totalValue = stock.reduce((sum, s) => sum + (s.current_quantity || 0) * (s.unit_cost || 0), 0)
  const lowStockCount = alerts.length
  const totalWastage = wastage.reduce((sum, w) => sum + w.quantity, 0)

  const sections = [
    { title: 'Stock Overview', href: '/dashboard/inventory', icon: Package, value: `${stock.length} items`, color: 'bg-blue-500' },
    { title: 'Low Stock Alerts', href: '/dashboard/inventory', icon: AlertTriangle, value: `${lowStockCount} alerts`, color: lowStockCount > 0 ? 'bg-red-500' : 'bg-green-500' },
    { title: 'Inventory Value', href: '/dashboard/inventory', icon: TrendingDown, value: `ETB ${totalValue.toFixed(0)}`, color: 'bg-purple-500' },
    { title: 'Suppliers', href: '/dashboard/inventory/suppliers', icon: Truck, color: 'bg-orange-500' },
    { title: 'Purchases', href: '/dashboard/inventory/purchases', icon: ShoppingCart, color: 'bg-teal-500' },
  ]

  if (stockLoading) return <LoadingSpinner size="lg" />

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Inventory Management</h1>

      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="flex flex-row items-center gap-2 pb-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-sm text-red-700">Low Stock Alerts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alerts.slice(0, 5).map(alert => (
              <div key={alert.id} className="flex justify-between text-sm">
                <span>{alert.ingredient?.name || 'Unknown'}</span>
                <span className="text-red-600 font-medium">{alert.current_quantity} remaining (min: {alert.reorder_level})</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sections.map(section => {
          const Icon = section.icon
          return (
            <Link key={section.title} href={section.href}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="flex flex-row items-center gap-3 pb-2">
                  <div className={`p-2 rounded-lg ${section.color}`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-medium">{section.title}</CardTitle>
                    {section.value && <p className="text-xs text-muted-foreground mt-1">{section.value}</p>}
                  </div>
                </CardHeader>
              </Card>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-teal-500" />
              Recent Purchases
            </CardTitle>
            <Link href="/dashboard/inventory/purchases">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {purchases.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No purchases yet</p>
            ) : (
              <div className="space-y-2">
                {purchases.slice(0, 5).map(po => (
                  <div key={po.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                    <div>
                      <span className="font-medium">{po.order_number}</span>
                      <p className="text-xs text-muted-foreground">{po.supplier?.name || 'Unknown supplier'} &middot; {formatDate(po.order_date)}</p>
                    </div>
                    <div className="text-right">
                      <span className="font-medium">{formatCurrency(po.total_amount)}</span>
                      <Badge variant={po.status === 'received' ? 'default' : po.status === 'ordered' ? 'secondary' : 'outline'} className="ml-2 text-[10px]">
                        {po.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Trash2 className="h-4 w-4 text-orange-500" />
              Wastage Metrics
            </CardTitle>
            <Link href="/dashboard/inventory/wastage">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {wastage.length > 0 && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold text-orange-600">{totalWastage.toFixed(1)}</p>
                  <p className="text-xs text-muted-foreground">Total units wasted</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold">{wastage.length}</p>
                  <p className="text-xs text-muted-foreground">Wastage records</p>
                </div>
              </div>
            )}
            {wastage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No wastage recorded</p>
            ) : (
              <div className="space-y-2">
                {wastage.slice(0, 5).map(w => (
                  <div key={w.id} className="flex items-center justify-between py-1.5 border-b last:border-0 text-sm">
                    <div>
                      <span className="font-medium">{w.ingredient?.name || 'Unknown'}</span>
                      <p className="text-xs text-muted-foreground">{w.reason} &middot; {formatDate(w.created_at)}</p>
                    </div>
                    <span className="font-medium text-orange-600">{w.quantity}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Current Stock</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            {stock.slice(0, 20).map(item => (
              <div key={item.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{item.ingredient?.name}</span>
                  {item.current_quantity <= item.reorder_level && (
                    <Badge variant="destructive" className="text-xs">Low</Badge>
                  )}
                </div>
                <span className="text-sm font-mono">
                  {item.current_quantity} {item.ingredient?.unit?.symbol || 'units'}
                </span>
              </div>
            ))}
          </div>
          {stock.length === 0 && <p className="text-muted-foreground text-sm">No stock items configured. Add ingredients and set up stock levels.</p>}
        </CardContent>
      </Card>
    </div>
  )
}
