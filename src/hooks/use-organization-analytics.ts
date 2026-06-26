'use client'

import { useState, useEffect, useCallback } from 'react'
import type { OwnerAnalyticsData, RevenueTrend, BranchPerformance, PayrollSummary, InventorySummary, GrowthMetrics } from '@/hooks/use-owner-analytics'

export interface OrganizationOverview {
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
  totalInventoryValue: number
  revenueGrowth: number
  orderGrowth: number
}

export interface RevenueData {
  trends: RevenueTrend[]
  summary: {
    days: number
    totalRevenue: number
    totalOrders: number
    averageDailyRevenue: number
    trend: number
    peakDay: RevenueTrend | null
  } | null
}

export interface BranchData {
  branches: (BranchPerformance & {
    address: string | null
    phone: string | null
    totalRevenue: number
    totalOrders: number
    monthRevenue: number
    todayRevenue: number
    monthOrders: number
    todayOrders: number
    lowStockCount: number
  })[]
  summary: {
    totalBranches: number
    totalRevenue: number
    totalOrders: number
    averageOrderValue: number
    topBranch: (BranchPerformance & {
      address: string | null
      phone: string | null
      totalRevenue: number
      totalOrders: number
      monthRevenue: number
      todayRevenue: number
      monthOrders: number
      todayOrders: number
      lowStockCount: number
    }) | null
  }
}

function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error?.message || `Failed to fetch (${res.status})`)
      }
      const json = await res.json()
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }, [url])

  useEffect(() => { fetchData() }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}

export function useOrganizationAnalytics() {
  return useFetch<OrganizationOverview>('/api/organization/analytics')
}

export function useOrganizationRevenue(days = 30) {
  return useFetch<RevenueData>(`/api/organization/revenue?days=${days}`)
}

export function useOrganizationBranches() {
  return useFetch<BranchData>('/api/organization/branches')
}

export function useOrganizationReports(branchId?: string | null) {
  const url = branchId
    ? `/api/organization/reports?branchId=${encodeURIComponent(branchId)}`
    : '/api/organization/reports'
  return useFetch<OwnerAnalyticsData>(url)
}
