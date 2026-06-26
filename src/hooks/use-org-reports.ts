'use client'

import { useState, useEffect, useCallback } from 'react'
import type { OwnerAnalyticsData } from '@/hooks/use-owner-analytics'

export function useOrgReports(branchId?: string | null) {
  const [data, setData] = useState<OwnerAnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const url = branchId
        ? `/api/organization/reports?branchId=${encodeURIComponent(branchId)}`
        : '/api/organization/reports'
      const res = await fetch(url)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error?.message || `Failed to fetch organization reports (${res.status})`)
      }
      const json = await res.json()
      setData(json.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load organization reports')
    } finally {
      setLoading(false)
    }
  }, [branchId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { data, loading, error, refetch: fetchData }
}
