'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { useKDS } from '@/hooks/use-kds'
import { createClient } from '@/lib/supabase/client'
import { KDSOrderCard } from '@/components/kitchen/kds-order-card'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { EmptyState } from '@/components/shared/empty-state'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { KDSOrderItem } from '@/types/kitchen'
import { ChefHat, Timer, CheckCircle, Clock, Flame, Snowflake, UtensilsCrossed, Coffee } from 'lucide-react'

const stationIcons: Record<string, typeof ChefHat> = {
  grill: Flame,
  cold: Snowflake,
  pastry: Coffee,
  bar: Coffee,
}

function getStationIcon(name: string) {
  const key = name.toLowerCase()
  for (const [kw, icon] of Object.entries(stationIcons)) {
    if (key.includes(kw)) return icon
  }
  return UtensilsCrossed
}

interface StationMetric {
  name: string
  pendingItems: number
  activeItems: number
  avgPrepTime: number | null
}

export default function KitchenDashboardPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const { orders, loading, acceptOrder, updateItemPrepStatus } = useKDS(profile?.restaurant_id)
  const [stations, setStations] = useState<StationMetric[]>([])
  const [avgPrepTime, setAvgPrepTime] = useState<number | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(false)

  useEffect(() => {
    const handler = () => setSoundEnabled(true)
    document.addEventListener('click', handler, { once: true })
    return () => document.removeEventListener('click', handler)
  }, [])

  useEffect(() => {
    if (!profile?.restaurant_id || loading) return
    const supabase = createClient()

    supabase.from('kitchen_stations').select('id, name').eq('restaurant_id', profile.restaurant_id).eq('is_active', true)
      .then(({ data: stationRows }) => {
        if (!stationRows) return
        const stationMap = new Map(stationRows.map((s: { id: string; name: string }) => [s.id, s.name]))

        const allItems = orders.flatMap(o => o.items || [])
        const completedItems = allItems.filter((i: KDSOrderItem) => i.prep_completed_at && i.prep_started_at)

        const totalSeconds = completedItems.reduce((sum: number, i: KDSOrderItem) => {
          const start = new Date(i.prep_started_at!).getTime()
          const end = new Date(i.prep_completed_at!).getTime()
          return sum + Math.round((end - start) / 1000)
        }, 0)
        setAvgPrepTime(completedItems.length > 0 ? Math.round(totalSeconds / completedItems.length / 60) : null)

        const stationMetrics = stationRows.map((s: { id: string; name: string }) => {
          const stationItems = allItems.filter((i: KDSOrderItem) => i.station_id === s.id)
          const stationCompleted = stationItems.filter((i: KDSOrderItem) => i.prep_completed_at && i.prep_started_at)
          const stationTotalSec = stationCompleted.reduce((sum: number, i: KDSOrderItem) => {
            const start = new Date(i.prep_started_at!).getTime()
            const end = new Date(i.prep_completed_at!).getTime()
            return sum + Math.round((end - start) / 1000)
          }, 0)
          return {
            name: s.name,
            pendingItems: stationItems.filter((i: KDSOrderItem) => i.prep_status === 'new').length,
            activeItems: stationItems.filter((i: KDSOrderItem) => i.prep_status === 'preparing').length,
            avgPrepTime: stationCompleted.length > 0 ? Math.round(stationTotalSec / stationCompleted.length / 60) : null,
          }
        })
        setStations(stationMetrics)
      })
  }, [profile?.restaurant_id, orders, loading])

  const newOrders = orders.filter(o => o.status === 'pending')
  const activeOrders = orders.filter(o => ['accepted', 'preparing'].includes(o.status))
  const readyOrders = orders.filter(o => o.status === 'ready')

  const stats = [
    { label: t('kitchen.new'), value: newOrders.length, icon: Clock, color: 'bg-yellow-500' },
    { label: t('kitchen.inProgress'), value: activeOrders.length, icon: Timer, color: 'bg-blue-500' },
    { label: t('kitchen.ready'), value: readyOrders.length, icon: CheckCircle, color: 'bg-green-500' },
    { label: t('kitchen.total'), value: orders.length, icon: ChefHat, color: 'bg-purple-500' },
  ]

  if (loading) return <LoadingSpinner size="lg" />

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('kitchen.title')}</h1>
        <Badge variant={soundEnabled ? 'default' : 'outline'} className="cursor-pointer" onClick={() => setSoundEnabled(!soundEnabled)}>
          {soundEnabled ? t('kitchen.soundOn') : t('kitchen.soundOff')}
        </Badge>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map(stat => {
          const Icon = stat.icon
          return (
            <Card key={stat.label}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.color}`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {stations.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stations.map((station) => {
            const Icon = getStationIcon(station.name)
            return (
              <Card key={station.name}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{station.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('kitchen.pending')}</span>
                    <span className="font-medium">{station.pendingItems}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{t('kitchen.active')}</span>
                    <span className="font-medium">{station.activeItems}</span>
                  </div>
                  {station.avgPrepTime !== null && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{t('kitchen.avgPrep')}</span>
                      <span className="font-medium">{station.avgPrepTime} min</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <Tabs defaultValue="new">
        <TabsList>
          <TabsTrigger value="new">{t('kitchen.new')} ({newOrders.length})</TabsTrigger>
          <TabsTrigger value="active">{t('kitchen.preparing')} ({activeOrders.length})</TabsTrigger>
          <TabsTrigger value="ready">{t('kitchen.ready')} ({readyOrders.length})</TabsTrigger>
          <TabsTrigger value="all">{t('kitchen.all')} ({orders.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-4">
          {newOrders.length === 0 ? (
            <EmptyState icon={<ChefHat className="h-12 w-12" />} title={t('kitchen.noNewOrders')} description={t('kitchen.waiting')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {newOrders.map(order => (
                <KDSOrderCard key={order.id} order={order} onAccept={acceptOrder} onUpdateStatus={updateItemPrepStatus} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="active" className="mt-4">
          {activeOrders.length === 0 ? (
            <EmptyState icon={<Timer className="h-12 w-12" />} title={t('kitchen.noActiveOrders')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {activeOrders.map(order => (
                <KDSOrderCard key={order.id} order={order} onAccept={acceptOrder} onUpdateStatus={updateItemPrepStatus} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ready" className="mt-4">
          {readyOrders.length === 0 ? (
            <EmptyState icon={<CheckCircle className="h-12 w-12" />} title={t('kitchen.noReadyOrders')} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {readyOrders.map(order => (
                <KDSOrderCard key={order.id} order={order} onAccept={acceptOrder} onUpdateStatus={updateItemPrepStatus} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {orders.map(order => (
              <KDSOrderCard key={order.id} order={order} onAccept={acceptOrder} onUpdateStatus={updateItemPrepStatus} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
