'use client'

import { useState, useCallback } from 'react'
import type { ReceiptType } from '@/types/enterprise'

interface Receipt {
  id: string
  restaurant_id: string
  order_id: string
  receipt_type: ReceiptType
  receipt_number: string
  receipt_data: Record<string, unknown> | null
  receipt_text: string | null
  receipt_html: string | null
  status: string
  sent_to: string | null
  sent_at: string | null
  qr_code_data: string | null
  qr_code_url: string | null
  generated_by: string | null
  created_at: string
}

interface ReceiptListResponse {
  data: Receipt[]
  total: number
  page: number
  pageSize: number
}

export function useReceipts() {
  const [data, setData] = useState<Receipt[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReceipts = useCallback(async (params?: {
    orderId?: string
    receiptType?: string
    status?: string
    from?: string
    to?: string
    page?: number
    pageSize?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (params?.orderId) query.set('orderId', params.orderId)
      if (params?.receiptType) query.set('receiptType', params.receiptType)
      if (params?.status) query.set('status', params.status)
      if (params?.from) query.set('from', params.from)
      if (params?.to) query.set('to', params.to)
      if (params?.page) query.set('page', String(params.page))
      if (params?.pageSize) query.set('pageSize', String(params.pageSize))

      const res = await fetch(`/api/receipts?${query}`)
      const body: ReceiptListResponse = await res.json()
      if (!res.ok) { setError('Failed to fetch receipts'); return }
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

  return { data, total, page, pageSize, loading, error, fetchReceipts }
}

export function useReceipt(id?: string) {
  const [data, setData] = useState<Receipt | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReceipt = useCallback(async (receiptId?: string) => {
    const targetId = receiptId || id
    if (!targetId) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/receipts/${targetId}`)
      const body = await res.json()
      if (!res.ok) { setError(body.error?.message || 'Failed to fetch receipt'); return }
      setData(body.data || null)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [id])

  return { data, loading, error, fetchReceipt }
}

export function useGenerateReceipt() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generate = useCallback(async (order_id: string, receipt_type?: ReceiptType): Promise<Receipt | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/receipts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id, receipt_type: receipt_type || 'thermal_80mm' }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to generate receipt')
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

export function useSendReceipt() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = useCallback(async (id: string, email: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/receipts/${id}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error?.message || 'Failed to send receipt')
        return false
      }
      return true
    } catch {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { send, loading, error }
}

export type { Receipt, ReceiptType }
