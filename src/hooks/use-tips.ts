'use client'

import { useState, useCallback } from 'react'
import type { StaffTip, TipPool, TipDistribution } from '@/types/enterprise'

interface TipSummary {
  total_tips: number
  total_amount: number
  pending_amount: number
  confirmed_amount: number
  paid_out_amount: number
  by_type: { cash: number; mobile: number; manual: number }
  pools: { total: number; open: number; distributed: number }
  period: { from: string; to: string }
}

interface StaffTipWithEmployee extends StaffTip {
  employee?: { id: string; name: string; role: string }
}

interface TipPoolWithRelations extends TipPool {
  tips?: StaffTipWithEmployee[]
  distributions?: (TipDistribution & { employee?: { id: string; name: string; role: string } })[]
}

export function useTips() {
  const [data, setData] = useState<StaffTipWithEmployee[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)

  const fetchTips = useCallback(async (params?: {
    employeeId?: string
    poolId?: string
    status?: string
    from?: string
    to?: string
    page?: number
    pageSize?: number
  }) => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (params?.employeeId) query.set('employeeId', params.employeeId)
      if (params?.poolId) query.set('poolId', params.poolId)
      if (params?.status) query.set('status', params.status)
      if (params?.from) query.set('from', params.from)
      if (params?.to) query.set('to', params.to)
      if (params?.page) query.set('page', String(params.page))
      if (params?.pageSize) query.set('pageSize', String(params.pageSize))

      const res = await fetch(`/api/tips?${query}`)
      if (!res.ok) return
      const body = await res.json()
      setData(body.data || [])
      setTotal(body.total || 0)
      setPage(body.page || 1)
      setPageSize(body.pageSize || 20)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, total, page, pageSize, loading, fetchTips }
}

export function useCreateTip() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (params: {
    employee_id: string
    tip_type: string
    amount: number
    order_id?: string
    tip_pool_id?: string
    notes?: string
  }): Promise<StaffTip | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to create tip')
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

  return { create, loading, error, clearError: () => setError(null) }
}

export function useUpdateTip() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (id: string, params: Record<string, unknown>): Promise<StaffTip | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/tips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to update tip')
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

  return { update, loading, error, clearError: () => setError(null) }
}

export function useTipPools() {
  const [data, setData] = useState<TipPool[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)

  const fetchPools = useCallback(async (params?: {
    status?: string
    from?: string
    to?: string
    page?: number
  }) => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (params?.status) query.set('status', params.status)
      if (params?.from) query.set('from', params.from)
      if (params?.to) query.set('to', params.to)
      if (params?.page) query.set('page', String(params.page))

      const res = await fetch(`/api/tips/pools?${query}`)
      if (!res.ok) return
      const body = await res.json()
      setData(body.data || [])
      setTotal(body.total || 0)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, total, loading, fetchPools }
}

export function useTipPoolDetail() {
  const [pool, setPool] = useState<TipPoolWithRelations | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchPool = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/tips/pools/${id}`)
      if (!res.ok) return
      const body = await res.json()
      setPool(body.data || null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  return { pool, loading, fetchPool }
}

export function useCreatePool() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (params: {
    name: string
    description?: string
    pool_period_start: string
    pool_period_end: string
    distribution_method?: string
  }): Promise<TipPool | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tips/pools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to create pool')
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

  return { create, loading, error, clearError: () => setError(null) }
}

export function useDistributePool() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const distribute = useCallback(async (
    tip_pool_id: string,
    distributions: Array<{ employee_id: string; weight?: number; amount: number }>,
  ): Promise<TipDistribution[] | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tips/distributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tip_pool_id, distributions }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to distribute')
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

  return { distribute, loading, error, clearError: () => setError(null) }
}

export function usePayOut() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const payOut = useCallback(async (distribution_ids: string[]): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/tips/payouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ distribution_ids }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to process payout')
        return false
      }
      return body.success
    } catch {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { payOut, loading, error, clearError: () => setError(null) }
}

export function useTipSummary() {
  const [summary, setSummary] = useState<TipSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchSummary = useCallback(async (params?: { from?: string; to?: string }) => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (params?.from) query.set('from', params.from)
      if (params?.to) query.set('to', params.to)

      const res = await fetch(`/api/tips/summary?${query}`)
      if (!res.ok) return
      const body = await res.json()
      setSummary(body.data || null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  return { summary, loading, fetchSummary }
}

export type { StaffTipWithEmployee, TipPoolWithRelations, TipSummary }
