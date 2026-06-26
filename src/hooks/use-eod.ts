'use client'

import { useState, useCallback } from 'react'

interface EODClosingItem {
  id: string
  eod_closing_id: string
  payment_method: string
  expected_amount: number
  actual_amount: number
  difference: number
}

interface EODApproval {
  id: string
  eod_closing_id: string
  approved_by: string
  status: string
  notes: string | null
  created_at: string
}

interface EODClosing {
  id: string
  restaurant_id: string
  branch_id: string | null
  business_date: string
  opened_at: string | null
  closed_at: string | null
  status: string
  total_orders: number
  total_sales: number
  cash_sales: number
  card_sales: number
  mobile_money_sales: number
  expected_cash: number
  actual_cash: number
  discrepancy_amount: number
  notes: string | null
  closed_by: string | null
  approved_by: string | null
  created_at: string
  updated_at: string
  eod_closing_items?: EODClosingItem[]
  eod_approvals?: EODApproval[]
}

interface EODHistoryResponse {
  data: EODClosing[]
  total: number
  page: number
  pageSize: number
}

export function useCurrentEOD() {
  const [data, setData] = useState<EODClosing | null>(null)
  const [salesSummary, setSalesSummary] = useState<{
    total_orders: number
    total_sales: number
    cash_sales: number
    card_sales: number
    mobile_money_sales: number
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const fetchCurrent = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/eod/current')
      if (!res.ok) return
      const body = await res.json()
      setData(body.data || null)
      setSalesSummary(body.sales_summary || null)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, salesSummary, loading, fetchCurrent }
}

export function useEODHistory() {
  const [data, setData] = useState<EODClosing[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)

  const fetchHistory = useCallback(async (params?: {
    from?: string; to?: string; status?: string; page?: number; pageSize?: number
  }) => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (params?.from) query.set('from', params.from)
      if (params?.to) query.set('to', params.to)
      if (params?.status) query.set('status', params.status)
      if (params?.page) query.set('page', String(params.page))
      if (params?.pageSize) query.set('pageSize', String(params.pageSize))

      const res = await fetch(`/api/eod/history?${query}`)
      if (!res.ok) return
      const body: EODHistoryResponse = await res.json()
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

  return { data, total, page, pageSize, loading, fetchHistory }
}

export function useCloseEOD() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const close = useCallback(async (params: {
    actual_cash?: number
    notes?: string
    items?: { payment_method: string; expected_amount: number; actual_amount: number }[]
  }): Promise<EODClosing | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/eod/close', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to close EOD')
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

  return { close, loading, error, clearError: () => setError(null) }
}

export function useApproveEOD() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const approve = useCallback(async (eod_closing_id: string, status: 'approved' | 'rejected', notes?: string): Promise<EODClosing | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/eod/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eod_closing_id, status, notes }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to approve EOD')
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

  const reopen = useCallback(async (eod_closing_id: string, reason?: string): Promise<EODClosing | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/eod/reopen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eod_closing_id, reason }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to reopen EOD')
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

  return { approve, reopen, loading, error, clearError: () => setError(null) }
}
