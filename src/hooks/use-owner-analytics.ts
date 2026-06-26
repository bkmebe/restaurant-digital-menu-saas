'use client'

import { useState, useEffect, useCallback } from 'react'

export interface OwnerOverview {
  totalRevenue: number
  revenueToday: number
  revenueMonth: number
  totalOrders: number
  ordersToday: number
  ordersMonth: number
  activeEmployees: number
  menuItemCount: number
  lowStockCount: number
  branchCount: number
  averageOrderValue: number
}

export interface RevenueTrend {
  date: string
  revenue: number
  orders: number
}

export interface BranchPerformance {
  id: string
  name: string
  revenue: number
  orders: number
  avgOrderValue: number
  tablesServed: number
}

export interface PopularItem {
  name: string
  menu_item_id: string
  total_quantity: number
  total_revenue: number
}

export interface PayrollSummary {
  totalSalary: number
  totalBonuses: number
  totalDeductions: number
  netPay: number
  employeeCount: number
  pendingCount: number
}

export interface InventorySummary {
  totalIngredients: number
  lowStockCount: number
  totalValue: number
}

export interface GrowthMetrics {
  revenueGrowth: number
  orderGrowth: number
}

export interface OwnerAnalyticsData {
  overview: OwnerOverview
  revenue_trends: RevenueTrend[]
  branch_performance: BranchPerformance[]
  popular_items: PopularItem[]
  payroll_summary: PayrollSummary | null
  inventory_summary: InventorySummary | null
  growth_metrics: GrowthMetrics
}

export function useOwnerAnalytics() {
  const [data, setData] = useState<OwnerAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/owner/analytics')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error?.message || `Failed to fetch owner analytics (${res.status})`)
      }
      const json = await res.json()
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
