'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useTenant } from '@/hooks/use-tenant'
import { useSelectedBranch } from '@/hooks/use-selected-branch'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { formatCurrency } from '@/lib/utils/format'
import { Package, AlertTriangle, Search, Building2 } from 'lucide-react'

interface CrossBranchStockItem {
  id: string
  restaurant_id: string
  ingredient_id: string
  current_quantity: number
  unit_id: string | null
  reorder_level: number
  reorder_quantity: number
  unit_cost: number
  location: string | null
  branch_name: string
  ingredient: { id: string; name: string; name_am: string | null; name_om: string | null; category: string | null } | null
}

interface CrossBranchSummary {
  totalItems: number
  totalValue: number
  lowStockCount: number
  branchCount: number
  categories: string[]
}

interface BranchSummary {
  id: string
  name: string
  itemCount: number
  totalValue: number
  lowStockCount: number
}

export default function CrossBranchInventoryPage() {
  const { t, locale } = useLanguage()
  const { restaurantId, isLoaded } = useTenant()
  const { selectedBranchId } = useSelectedBranch(isLoaded ? restaurantId : null)
  const [data, setData] = useState<CrossBranchStockItem[]>([])
  const [summary, setSummary] = useState<CrossBranchSummary | null>(null)
  const [byBranch, setByBranch] = useState<BranchSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = selectedBranchId
        ? `/api/inventory/cross-branch?branchId=${encodeURIComponent(selectedBranchId)}`
        : '/api/inventory/cross-branch'
      const res = await fetch(url)
      if (!res.ok) throw new Error(`Failed to fetch cross-branch inventory (${res.status})`)
      const json = await res.json()
      setData(json.data || [])
      setSummary(json.summary)
      setByBranch(json.byBranch || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [selectedBranchId])

  useEffect(() => { fetchData() }, [fetchData])

  const ingredientName = (item: CrossBranchStockItem) => {
    if (!item.ingredient) return t('inventory.unknown')
    if (locale === 'am' && item.ingredient.name_am) return item.ingredient.name_am
    if (locale === 'om' && item.ingredient.name_om) return item.ingredient.name_om
    return item.ingredient.name
  }

  const filtered = data.filter(item => {
    if (!search) return true
    const name = ingredientName(item).toLowerCase()
    const branch = item.branch_name.toLowerCase()
    const q = search.toLowerCase()
    return name.includes(q) || branch.includes(q)
  })

  if (loading) return <LoadingSpinner size="lg" />

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-lg font-semibold text-red-600">{error}</p>
        <button onClick={fetchData} className="mt-4 text-sm text-muted-foreground underline hover:text-foreground">
          {t('common.retry')}
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('sidebar.crossBranchInventory')}</h1>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Package className="h-4 w-4 text-blue-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('inventory.totalItems')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.totalItems}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Building2 className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('inventory.branches')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.branchCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('inventory.lowStockAlerts')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{summary.lowStockCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center gap-2 pb-2">
              <Package className="h-4 w-4 text-green-500" />
              <CardTitle className="text-xs font-medium text-muted-foreground">{t('inventory.totalValue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{formatCurrency(summary.totalValue)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {byBranch.length > 1 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {byBranch.map(b => (
            <Card key={b.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">{b.name}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>{t('inventory.items')}: {b.itemCount}</p>
                <p>{t('inventory.value')}: {formatCurrency(b.totalValue)}</p>
                <p>{t('inventory.lowStock')}: {b.lowStockCount}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('common.search')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('inventory.currentStock')}</CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('inventory.noStock')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">{t('inventory.ingredient')}</th>
                    <th className="pb-2 font-medium">{t('inventory.branch')}</th>
                    <th className="pb-2 font-medium text-right">{t('inventory.quantity')}</th>
                    <th className="pb-2 font-medium text-right">{t('inventory.unitCost')}</th>
                    <th className="pb-2 font-medium text-right">{t('inventory.total')}</th>
                    <th className="pb-2 font-medium">{t('inventory.status')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(item => {
                    const total = Number(item.current_quantity) * Number(item.unit_cost)
                    const isLow = Number(item.current_quantity) <= Number(item.reorder_level)
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="py-2.5 pr-4">{ingredientName(item)}</td>
                        <td className="py-2.5 pr-4">{item.branch_name}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{Number(item.current_quantity)}</td>
                        <td className="py-2.5 pr-4 text-right">{formatCurrency(item.unit_cost)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{formatCurrency(total)}</td>
                        <td className="py-2.5">
                          {isLow ? (
                            <Badge variant="destructive" className="text-xs">{t('inventory.low')}</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">{t('inventory.ok')}</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
