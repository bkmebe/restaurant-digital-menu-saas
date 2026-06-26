'use client'

import { useState, useCallback } from 'react'
import { Reservation } from '@/types/enterprise'
import { Table } from '@/types/database'

const gFetch = globalThis.fetch

interface ReservationFilters {
  date?: string
  status?: string
  search?: string
  page?: number
  pageSize?: number
}

export function useReservations() {
  const [data, setData] = useState<Reservation[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (params?: ReservationFilters) => {
    setLoading(true)
    setError(null)
    try {
      const sp = new URLSearchParams()
      if (params?.date) sp.set('date', params.date)
      if (params?.status) sp.set('status', params.status)
      if (params?.search) sp.set('search', params.search)
      if (params?.page) sp.set('page', String(params.page))
      if (params?.pageSize) sp.set('pageSize', String(params.pageSize))
      const res = await gFetch(`/api/reservations?${sp}`)
      if (!res.ok) { setError('Failed to fetch'); setData([]); return }
      const body = await res.json()
      setData(body.data || [])
      setTotal(body.total || 0)
    } catch { setError('Network error') } finally { setLoading(false) }
  }, [])

  return { data, total, loading, error, fetch: load, setData }
}

export function useReservation() {
  const [data, setData] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await gFetch(`/api/reservations/${id}`)
      if (!res.ok) { setError('Not found'); setData(null); return }
      const body = await res.json()
      setData(body.data)
    } catch { setError('Network error') } finally { setLoading(false) }
  }, [])

  return { data, loading, error, fetch: load }
}

export function useCreateReservation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const create = useCallback(async (params: {
    customer_name: string
    customer_phone?: string
    customer_email?: string
    guest_count: number
    reservation_date: string
    reservation_time: string
    duration_minutes?: number
    special_requests?: string
    notes?: string
    table_ids?: string[]
  }): Promise<Reservation | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await gFetch('/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) { const b = await res.json(); setError(b.error?.message || 'Failed'); return null }
      const body = await res.json()
      return body.data
    } catch { setError('Network error'); return null } finally { setLoading(false) }
  }, [])

  return { create, loading, error, clearError: () => setError(null) }
}

export function useUpdateReservation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback(async (id: string, params: Record<string, unknown>): Promise<Reservation | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await gFetch(`/api/reservations/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) { const b = await res.json(); setError(b.error?.message || 'Failed'); return null }
      const body = await res.json()
      return body.data
    } catch { setError('Network error'); return null } finally { setLoading(false) }
  }, [])

  return { update, loading, error, clearError: () => setError(null) }
}

export function useCancelReservation() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const cancel = useCallback(async (id: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await gFetch(`/api/reservations/${id}`, { method: 'DELETE' })
      if (!res.ok) { const b = await res.json(); setError(b.error?.message || 'Failed'); return false }
      return true
    } catch { setError('Network error'); return false } finally { setLoading(false) }
  }, [])

  return { cancel, loading, error, clearError: () => setError(null) }
}

export function useAvailability() {
  const [data, setData] = useState<Table[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const check = useCallback(async (params: { date: string; time: string; guestCount: number; durationMinutes?: number; excludeReservationId?: string }) => {
    setLoading(true)
    setError(null)
    try {
      const sp = new URLSearchParams({ date: params.date, time: params.time, guestCount: String(params.guestCount) })
      if (params.durationMinutes) sp.set('durationMinutes', String(params.durationMinutes))
      if (params.excludeReservationId) sp.set('excludeReservationId', params.excludeReservationId)
      const res = await gFetch(`/api/reservations/availability?${sp}`)
      if (!res.ok) { setError('Failed'); setData([]); return }
      const body = await res.json()
      setData(body.data || [])
    } catch { setError('Network error') } finally { setLoading(false) }
  }, [])

  return { data, loading, error, check }
}

interface WaitlistEntry {
  id: string
  customer_name: string
  customer_phone: string | null
  customer_email: string | null
  guest_count: number
  status: string
  notified_at: string | null
  notes: string | null
  created_at: string
}

interface WaitlistFilters {
  status?: string
  page?: number
  pageSize?: number
}

export function useWaitlist() {
  const [data, setData] = useState<WaitlistEntry[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (params?: WaitlistFilters) => {
    setLoading(true)
    setError(null)
    try {
      const sp = new URLSearchParams()
      if (params?.status) sp.set('status', params.status)
      if (params?.page) sp.set('page', String(params.page))
      if (params?.pageSize) sp.set('pageSize', String(params.pageSize))
      const res = await gFetch(`/api/reservations/waitlist?${sp}`)
      if (!res.ok) { setError('Failed'); setData([]); return }
      const body = await res.json()
      setData(body.data || [])
      setTotal(body.total || 0)
    } catch { setError('Network error') } finally { setLoading(false) }
  }, [])

  const add = useCallback(async (params: {
    customer_name: string
    customer_phone?: string
    customer_email?: string
    guest_count: number
    notes?: string
  }): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await gFetch('/api/reservations/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })
      if (!res.ok) { const b = await res.json(); setError(b.error?.message || 'Failed'); return false }
      return true
    } catch { setError('Network error'); return false } finally { setLoading(false) }
  }, [])

  const updateStatus = useCallback(async (id: string, status: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await gFetch(`/api/reservations/waitlist/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) { const b = await res.json(); setError(b.error?.message || 'Failed'); return false }
      return true
    } catch { setError('Network error'); return false } finally { setLoading(false) }
  }, [])

  return { data, total, loading, error, fetch: load, add, updateStatus }
}
