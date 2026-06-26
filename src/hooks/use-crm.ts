'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CustomerProfile, RewardPointsTransaction, VisitHistoryEntry, Coupon, MarketingCampaign } from '@/types/enterprise'

interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}

interface UseCustomersOptions {
  search?: string
  tier?: string
  tag?: string
  page?: number
  pageSize?: number
}

export function useCustomers(options: UseCustomersOptions = {}) {
  const [result, setResult] = useState<PaginatedResult<CustomerProfile>>({ data: [], total: 0, page: 1, pageSize: 20 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.search) params.set('search', options.search)
      if (options.tier) params.set('tier', options.tier)
      if (options.tag) params.set('tag', options.tag)
      if (options.page) params.set('page', options.page.toString())
      if (options.pageSize) params.set('pageSize', options.pageSize.toString())

      const res = await fetch(`/api/customers?${params}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'Failed to fetch customers')
      }
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [options.search, options.tier, options.tag, options.page, options.pageSize])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])

  return { ...result, loading, error, refetch: fetchCustomers }
}

export function useCustomer(id: string | undefined) {
  const [data, setData] = useState<CustomerProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) { setLoading(false); return }
    setLoading(true)
    fetch(`/api/customers/${id}`)
      .then(res => {
        if (!res.ok) throw new Error('Customer not found')
        return res.json()
      })
      .then(json => setData(json.data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  return { data, loading, error }
}

export function useCreateCustomer() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCustomer = async (customerData: { name: string; phone?: string; email?: string; notes?: string; tags?: string[] }) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create customer')
      return data.data as CustomerProfile
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createCustomer, loading, error }
}

export function useUpdateCustomer() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateCustomer = async (id: string, customerData: Partial<CustomerProfile>) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/customers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update customer')
      return data.data as CustomerProfile
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { updateCustomer, loading, error }
}

export function useCustomerPoints(customerId: string | undefined) {
  const [data, setData] = useState<RewardPointsTransaction[]>([])
  const [balance, setBalance] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customerId) { setLoading(false); return }
    setLoading(true)
    fetch(`/api/customers/${customerId}/points`)
      .then(res => res.json())
      .then(json => { setData(json.data || []); setBalance(json.balance || 0) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [customerId])

  return { data, balance, loading, error }
}

export function useAddPoints() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addPoints = async (customerId: string, pointsData: { points: number; source: string; description?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/customers/${customerId}/points`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pointsData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to add points')
      return data.data as RewardPointsTransaction
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { addPoints, loading, error }
}

export function useCustomerVisits(customerId: string | undefined) {
  const [data, setData] = useState<VisitHistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customerId) { setLoading(false); return }
    setLoading(true)
    fetch(`/api/customers/${customerId}/visits`)
      .then(res => res.json())
      .then(json => setData(json.data || []))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [customerId])

  return { data, loading, error }
}

export function useCoupons(options: { status?: string; type?: string; page?: number; pageSize?: number } = {}) {
  const [result, setResult] = useState<PaginatedResult<Coupon>>({ data: [], total: 0, page: 1, pageSize: 20 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCoupons = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.status) params.set('status', options.status)
      if (options.type) params.set('type', options.type)
      if (options.page) params.set('page', options.page.toString())
      if (options.pageSize) params.set('pageSize', options.pageSize.toString())

      const res = await fetch(`/api/coupons?${params}`)
      if (!res.ok) throw new Error('Failed to fetch coupons')
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [options.status, options.type, options.page, options.pageSize])

  useEffect(() => { fetchCoupons() }, [fetchCoupons])

  return { ...result, loading, error, refetch: fetchCoupons }
}

export function useCreateCoupon() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCoupon = async (couponData: Partial<Coupon>) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(couponData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create coupon')
      return data.data as Coupon
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createCoupon, loading, error }
}

export function useUpdateCoupon() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateCoupon = async (id: string, couponData: Partial<Coupon>) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/coupons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(couponData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update coupon')
      return data.data as Coupon
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { updateCoupon, loading, error }
}

export function useDeleteCoupon() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteCoupon = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/coupons/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to delete coupon')
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { deleteCoupon, loading, error }
}

export function useValidateCoupon() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const validateCoupon = async (code: string, customer_id: string, order_amount: number) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/coupons/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, customer_id, order_amount }),
      })
      return await res.json()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return { valid: false, reason: 'Validation failed' }
    } finally {
      setLoading(false)
    }
  }

  return { validateCoupon, loading, error }
}

export function useCampaigns(options: { status?: string; type?: string; page?: number; pageSize?: number } = {}) {
  const [result, setResult] = useState<PaginatedResult<MarketingCampaign>>({ data: [], total: 0, page: 1, pageSize: 20 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchCampaigns = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (options.status) params.set('status', options.status)
      if (options.type) params.set('type', options.type)
      if (options.page) params.set('page', options.page.toString())
      if (options.pageSize) params.set('pageSize', options.pageSize.toString())

      const res = await fetch(`/api/campaigns?${params}`)
      if (!res.ok) throw new Error('Failed to fetch campaigns')
      const data = await res.json()
      setResult(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [options.status, options.type, options.page, options.pageSize])

  useEffect(() => { fetchCampaigns() }, [fetchCampaigns])

  return { ...result, loading, error, refetch: fetchCampaigns }
}

export function useCreateCampaign() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createCampaign = async (campaignData: Partial<MarketingCampaign>) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to create campaign')
      return data.data as MarketingCampaign
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createCampaign, loading, error }
}

export function useUpdateCampaign() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateCampaign = async (id: string, campaignData: Partial<MarketingCampaign>) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/campaigns/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(campaignData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error?.message || 'Failed to update campaign')
      return data.data as MarketingCampaign
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { updateCampaign, loading, error }
}

export function useDeleteCampaign() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const deleteCampaign = async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/campaigns/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to delete campaign')
      }
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { deleteCampaign, loading, error }
}
