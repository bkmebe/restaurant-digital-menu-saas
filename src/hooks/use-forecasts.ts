'use client'

import { useState, useCallback } from 'react'
import type { InventoryForecast, ReorderSuggestion, ForecastRisk } from '@/types/enterprise'

interface ForecastListResponse {
  data: InventoryForecast[]
  total: number
  page: number
  pageSize: number
}

interface ReorderListResponse {
  data: ReorderSuggestion[]
  total: number
  page: number
  pageSize: number
}

export function useForecasts() {
  const [data, setData] = useState<InventoryForecast[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchForecasts = useCallback(async (params?: {
    ingredientId?: string
    stockoutRisk?: ForecastRisk
    reordering?: boolean
    from?: string
    to?: string
    page?: number
    pageSize?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (params?.ingredientId) query.set('ingredientId', params.ingredientId)
      if (params?.stockoutRisk) query.set('stockoutRisk', params.stockoutRisk)
      if (params?.reordering !== undefined) query.set('reordering', String(params.reordering))
      if (params?.from) query.set('from', params.from)
      if (params?.to) query.set('to', params.to)
      if (params?.page) query.set('page', String(params.page))
      if (params?.pageSize) query.set('pageSize', String(params.pageSize))

      const res = await fetch(`/api/forecasts?${query}`)
      const body: ForecastListResponse = await res.json()
      if (!res.ok) { setError('Failed to fetch forecasts'); return }
      setData(body.data || [])
      setTotal(body.total || 0)
      setPage(body.page || 1)
      setPageSize(body.pageSize || 20)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, total, page, pageSize, loading, error, fetchForecasts }
}

export function useCurrentForecast() {
  const [data, setData] = useState<InventoryForecast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchCurrent = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/forecasts/current')
      const body = await res.json()
      if (!res.ok) { setError('Failed to fetch current forecasts'); return }
      setData(body.data || [])
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchCurrent }
}

export function useReorderSuggestions() {
  const [data, setData] = useState<ReorderSuggestion[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSuggestions = useCallback(async (params?: {
    urgency?: string
    actioned?: string
    page?: number
    pageSize?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (params?.urgency) query.set('urgency', params.urgency)
      if (params?.actioned) query.set('actioned', params.actioned)
      if (params?.page) query.set('page', String(params.page))
      if (params?.pageSize) query.set('pageSize', String(params.pageSize))

      const res = await fetch(`/api/forecasts/reorder-suggestions?${query}`)
      const body: ReorderListResponse = await res.json()
      if (!res.ok) { setError('Failed to fetch reorder suggestions'); return }
      setData(body.data || [])
      setTotal(body.total || 0)
      setPage(body.page || 1)
      setPageSize(body.pageSize || 20)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, total, page, pageSize, loading, error, fetchSuggestions }
}

export function useLowStockForecast() {
  const [data, setData] = useState<InventoryForecast[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchLowStock = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/forecasts/low-stock')
      const body = await res.json()
      if (!res.ok) { setError('Failed to fetch low stock forecasts'); return }
      setData(body.data || [])
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetchLowStock }
}

export function useGenerateForecast() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (ingredient_id: string, days?: number): Promise<InventoryForecast[] | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/forecasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient_id, days: days || 30 }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to generate forecast')
        return null
      }
      return body.data
    } catch {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { generate, loading, error }
}

export function useGenerateReorderSuggestions() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (): Promise<ReorderSuggestion[] | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/forecasts/reorder-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to generate reorder suggestions')
        return null
      }
      return body.data
    } catch {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { generate, loading, error }
}

export function useActionReorderSuggestion() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const actionSuggestion = useCallback(async (id: string, updates: Record<string, unknown>): Promise<ReorderSuggestion | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/forecasts/reorder-suggestions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to update suggestion')
        return null
      }
      return body.data
    } catch {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { actionSuggestion, loading, error }
}
