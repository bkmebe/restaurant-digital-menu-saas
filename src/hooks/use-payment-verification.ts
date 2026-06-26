'use client'

import { useState, useCallback } from 'react'

export interface PaymentVerificationRecord {
  id: string
  restaurant_id: string
  order_id: string | null
  payment_config_id: string | null
  provider: string
  verification_method: string
  verification_reference: string | null
  receipt_image_url: string | null
  amount: number | null
  currency: string
  status: 'pending' | 'verified' | 'rejected' | 'disputed'
  verified_by: string | null
  verified_at: string | null
  verified_notes: string | null
  external_verification_id: string | null
  external_verification_data: Record<string, unknown> | null
  created_at: string
  updated_at: string
  order?: {
    id: string
    table_id: string
    total_amount: number
    status: string
    created_at: string
  } | null
  verified_by_employee?: {
    id: string
    full_name: string
  } | null
}

export function usePaymentVerifications() {
  const [data, setData] = useState<PaymentVerificationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadVerifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch('/api/payments/verify')
      if (!res.ok) {
        setError('Failed to load verifications')
        return
      }
      const body = await res.json()
      setData(body.data || [])
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetch: loadVerifications }
}

export function useCreatePaymentVerification() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (params: {
    order_id?: string
    provider: string
    verification_method?: string
    verification_reference?: string
    receipt_image_url?: string
    amount?: number
    payment_config_id?: string
  }): Promise<PaymentVerificationRecord | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/payments/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to create verification')
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

export function useUpdateVerification() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (
    id: string,
    status: 'verified' | 'rejected' | 'disputed',
    verified_notes?: string
  ): Promise<PaymentVerificationRecord | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/payments/verify/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, verified_notes }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to update verification')
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
