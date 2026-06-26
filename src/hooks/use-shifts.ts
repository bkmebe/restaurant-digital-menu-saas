'use client'

import { useState, useCallback } from 'react'

interface ShiftEmployee {
  full_name: string
  role: string
}

interface ShiftAssignment {
  id: string
  shift_id: string
  employee_id: string
  assigned_at: string
  accepted_at: string | null
  status: string
  employees?: ShiftEmployee
}

interface Shift {
  id: string
  restaurant_id: string
  employee_id: string | null
  title: string
  shift_date: string
  start_time: string
  end_time: string
  break_minutes: number
  status: string
  notes: string | null
  created_by: string
  created_at: string
  updated_at: string
  employees?: ShiftEmployee
  shift_assignments?: ShiftAssignment[]
}

interface ShiftListResponse {
  data: Shift[]
  total: number
  page: number
  pageSize: number
}

export function useShifts() {
  const [data, setData] = useState<Shift[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchShifts = useCallback(async (params?: {
    from?: string; to?: string; status?: string; employeeId?: string; page?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (params?.from) query.set('from', params.from)
      if (params?.to) query.set('to', params.to)
      if (params?.status) query.set('status', params.status)
      if (params?.employeeId) query.set('employeeId', params.employeeId)
      if (params?.page) query.set('page', String(params.page))

      const res = await fetch(`/api/shifts?${query}`)
      const body = await res.json()
      if (!res.ok) { setError(body.error?.message); return }
      setData(body.data || [])
      setTotal(body.total || 0)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  const createShift = useCallback(async (shift: {
    title: string; shift_date: string; start_time: string; end_time: string;
    break_minutes?: number; notes?: string; employee_id?: string
  }): Promise<Shift | null> => {
    setError(null)
    try {
      const res = await fetch('/api/shifts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(shift),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error?.message); return null }
      return body.data
    } catch {
      setError('Network error')
      return null
    }
  }, [])

  const updateShift = useCallback(async (id: string, updates: Record<string, unknown>): Promise<Shift | null> => {
    setError(null)
    try {
      const res = await fetch(`/api/shifts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error?.message); return null }
      return body.data
    } catch {
      setError('Network error')
      return null
    }
  }, [])

  const deleteShift = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const res = await fetch(`/api/shifts/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error?.message)
        return false
      }
      return true
    } catch {
      setError('Network error')
      return false
    }
  }, [])

  return { data, total, loading, error, fetchShifts, createShift, updateShift, deleteShift }
}

export function useShiftCalendar() {
  const [data, setData] = useState<Shift[]>([])
  const [employees, setEmployees] = useState<{ id: string; full_name: string; role: string }[]>([])
  const [coverage, setCoverage] = useState<Record<string, { total: number; assigned: number; unassigned: number }>>({})
  const [loading, setLoading] = useState(false)

  const fetchCalendar = useCallback(async (from: string, to: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/shifts/calendar?from=${from}&to=${to}`)
      if (!res.ok) return
      const body = await res.json()
      setData(body.data || [])
      setEmployees(body.employees || [])
      setCoverage(body.coverage || {})
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, employees, coverage, loading, fetchCalendar }
}

export function useShiftAssignments() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const assign = useCallback(async (shift_id: string, employee_id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/shifts/assign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id, employee_id }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error?.message); return null }
      return body.data
    } catch {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { assign, loading, error }
}

export function useShiftSwap() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const swap = useCallback(async (shift_id: string, from_employee_id: string, to_employee_id: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/shifts/swap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shift_id, from_employee_id, to_employee_id }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error?.message); return null }
      return body.data
    } catch {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { swap, loading, error }
}
