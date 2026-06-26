'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import {
  useCurrentForecast,
  useReorderSuggestions,
  useLowStockForecast,
  useGenerateForecast,
  useGenerateReorderSuggestions,
  useActionReorderSuggestion,
} from '@/hooks/use-forecasts'
import { isFeatureEnabled } from '@/lib/feature-flags'
import { KPICards } from '@/components/forecasts/kpi-cards'
import { ReorderSuggestions } from '@/components/forecasts/reorder-suggestions'
import { DemandChart } from '@/components/forecasts/demand-chart'
import { ForecastCard } from '@/components/forecasts/forecast-card'
import { SupplierRecommendations } from '@/components/forecasts/supplier-recommendations'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ArrowLeft, TrendingDown, RefreshCw, ShoppingCart, AlertTriangle, Store } from 'lucide-react'

export default function ForecastsPage() {
  const router = useRouter()
  const { profile } = useAuth()
  const { t } = useLanguage()
  const { data: currentForecasts, loading: currentLoading, fetchCurrent } = useCurrentForecast()
  const { data: suggestions, loading: suggestionsLoading, fetchSuggestions } = useReorderSuggestions()
  const { data: lowStockItems, loading: lowStockLoading, fetchLowStock } = useLowStockForecast()
  const { generate: generateForecast, loading: forecastGenerating } = useGenerateForecast()
  const { generate: generateSuggestions, loading: suggestionsGenerating } = useGenerateReorderSuggestions()
  const { actionSuggestion, loading: actionLoading } = useActionReorderSuggestion()

  const [selectedIngredient, setSelectedIngredient] = useState<string | null>(null)
  const [actioningId, setActioningId] = useState<string | null>(null)

  useEffect(() => {
    if (profile?.restaurant_id) {
      fetchCurrent()
      fetchSuggestions({ actioned: 'false' })
      fetchLowStock()
    }
  }, [profile?.restaurant_id, fetchCurrent, fetchSuggestions, fetchLowStock])

  const handleRefresh = useCallback(() => {
    fetchCurrent()
    fetchSuggestions({ actioned: 'false' })
    fetchLowStock()
  }, [fetchCurrent, fetchSuggestions, fetchLowStock])

  const handleGenerateAll = useCallback(async () => {
    if (lowStockItems.length > 0) {
      for (const item of lowStockItems) {
        await generateForecast(item.ingredient_id, 30)
      }
    }
    await generateSuggestions()
    handleRefresh()
  }, [lowStockItems, generateForecast, generateSuggestions, handleRefresh])

  const handleActionSuggestion = useCallback(async (id: string) => {
    setActioningId(id)
    await actionSuggestion(id, { is_actioned: true })
    setActioningId(null)
    fetchSuggestions({ actioned: 'false' })
  }, [actionSuggestion, fetchSuggestions])

  if (!isFeatureEnabled('forecasts')) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">{t('common.noData')}</p>
      </div>
    )
  }

  const isManager = profile?.role === 'admin' || profile?.role === 'inventory_manager' || profile?.role === 'manager' || profile?.role === 'system_admin'
  const loading = currentLoading || lowStockLoading

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" onClick={() => router.push('/dashboard')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{t('forecast.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('forecast.subtitle')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isManager && (
            <Button variant="outline" size="sm" onClick={handleGenerateAll} disabled={forecastGenerating || suggestionsGenerating} className="gap-2">
              <RefreshCw className={`h-4 w-4 ${forecastGenerating ? 'animate-spin' : ''}`} />
              {t('forecast.generateAll')}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loading} className="gap-2">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh')}
          </Button>
        </div>
      </div>

      {loading && currentForecasts.length === 0 ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <LoadingSpinner />
        </div>
      ) : (
        <>
          <KPICards
            totalForecasts={currentForecasts.length}
            criticalCount={currentForecasts.filter(f => f.stockout_risk === 'critical').length}
            highCount={currentForecasts.filter(f => f.stockout_risk === 'high').length}
            reorderRecommended={currentForecasts.filter(f => f.reorder_recommended).length}
          />

          <Tabs defaultValue="reorder" className="space-y-4">
            <TabsList>
              <TabsTrigger value="reorder" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                {t('forecast.reorderTab')}
              </TabsTrigger>
              <TabsTrigger value="demand" className="gap-2">
                <TrendingDown className="h-4 w-4" />
                {t('forecast.demandTab')}
              </TabsTrigger>
              <TabsTrigger value="lowstock" className="gap-2">
                <AlertTriangle className="h-4 w-4" />
                {t('forecast.lowStockTab')}
              </TabsTrigger>
              <TabsTrigger value="suppliers" className="gap-2">
                <Store className="h-4 w-4" />
                {t('forecast.suppliersTab')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reorder" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {t('forecast.reorderSubtitle')}
                </p>
                {isManager && (
                  <Button variant="outline" size="sm" onClick={handleGenerateAll} disabled={suggestionsGenerating} className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${suggestionsGenerating ? 'animate-spin' : ''}`} />
                    {t('forecast.generateSuggestions')}
                  </Button>
                )}
              </div>
              <ReorderSuggestions
                data={suggestions}
                loading={suggestionsLoading}
                onAction={handleActionSuggestion}
                actionLoading={actioningId}
              />
            </TabsContent>

            <TabsContent value="demand" className="space-y-4">
              {currentForecasts.length > 0 ? (
                <div className="space-y-4">
                  <select
                    className="h-9 w-full max-w-xs rounded-lg border border-input bg-background px-3 text-sm"
                    value={selectedIngredient || ''}
                    onChange={(e) => setSelectedIngredient(e.target.value || null)}
                  >
                    <option value="">{t('forecast.allIngredients')}</option>
                    {[...new Set(currentForecasts.map(f => f.ingredient_id))].map(id => {
                      const ing = currentForecasts.find(f => f.ingredient_id === id)?.ingredient as { name: string } | undefined
                      return (
                        <option key={id} value={id}>{ing?.name || id}</option>
                      )
                    })}
                  </select>
                  <DemandChart
                    data={selectedIngredient ? currentForecasts.filter(f => f.ingredient_id === selectedIngredient) : currentForecasts}
                  />
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">{t('forecast.noData')}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="lowstock" className="space-y-4">
              {lowStockItems.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {lowStockItems.map(item => (
                    <ForecastCard key={item.id} forecast={item} />
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-12">
                  <p className="text-sm text-muted-foreground">{t('forecast.noLowStock')}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="suppliers" className="space-y-4">
              {isManager && (
                <Button variant="outline" size="sm" onClick={handleGenerateAll} disabled={suggestionsGenerating} className="gap-2 mb-4">
                  <RefreshCw className={`h-4 w-4 ${suggestionsGenerating ? 'animate-spin' : ''}`} />
                  {t('forecast.rankSuppliers')}
                </Button>
              )}
              <SupplierRecommendations
                suppliers={suggestions
                  .filter(s => s.preferred_supplier)
                  .map(s => ({
                    id: (s.preferred_supplier as { id: string; name: string } | null)?.id || s.preferred_supplier_id || '',
                    name: (s.preferred_supplier as { name: string } | null)?.name || s.preferred_supplier_id || '',
                    score: Math.round(100 - (s.urgency === 'overdue' ? 80 : s.urgency === 'critical' ? 60 : s.urgency === 'soon' ? 30 : 10)),
                  }))
                  .filter(s => s.id && s.name)
                }
              />
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  )
}
