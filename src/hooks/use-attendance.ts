'use client'

import { useState, useCallback } from 'react'

interface AttendanceRecord {
  id: string
  employee_id: string
  date: string
  clock_in: string | null
  clock_out: string | null
  total_break_minutes: number
  status: string
  late_minutes: number
  overtime_minutes: number
  notes: string | null
  employees?: { full_name: string; role: string }
}

interface ClockResponse {
  data: AttendanceRecord
}

interface ClockAction {
  action: 'clock_in' | 'clock_out' | 'break_start' | 'break_end'
}

export function useAttendanceClock() {
  const [clocking, setClocking] = useState(false)
  const [lastClock, setLastClock] = useState<AttendanceRecord | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clock = useCallback(async (action: ClockAction['action']) => {
    setClocking(true)
    setError(null)
    try {
      const res = await fetch('/api/attendance/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to clock')
        return null
      }
      setLastClock(body.data)
      return body.data as AttendanceRecord
    } catch {
      setError('Network error')
      return null
    } finally {
      setClocking(false)
    }
  }, [])

  return { clock, clocking, lastClock, error, clearError: () => setError(null) }
}

export function useAttendanceCurrent() {
  const [loading, setLoading] = useState(false)
  const [records, setRecords] = useState<AttendanceRecord[]>([])
  const [employees, setEmployees] = useState<{ id: string; full_name: string }[]>([])

  const fetchCurrent = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/attendance/current')
      if (!res.ok) return
      const body = await res.json()
      setRecords(body.data || [])
      setEmployees(body.employees || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  return { records, employees, loading, fetchCurrent }
}

export function useAttendanceHistory() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AttendanceRecord[]>([])
  const [total, setTotal] = useState(0)

  const fetchHistory = useCallback(async (params?: { from?: string; to?: string; status?: string; employeeId?: string; page?: number }) => {
    setLoading(true)
    try {
      const query = new URLSearchParams()
      if (params?.from) query.set('from', params.from)
      if (params?.to) query.set('to', params.to)
      if (params?.status) query.set('status', params.status)
      if (params?.employeeId) query.set('employeeId', params.employeeId)
      if (params?.page) query.set('page', String(params.page))

      const res = await fetch(`/api/attendance/history?${query}`)
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

  return { data, total, loading, fetchHistory }
}

export function useAttendanceStats() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<{
    today: { present: number; late: number; absent: number; overtime: number; total: number; totalActive: number; clockedIn: number }
    week: { total: number; totalOvertimeMinutes: number; totalLateMinutes: number; uniqueDays: number }
    month: { total: number }
  } | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/attendance/stats')
      if (!res.ok) return
      const body = await res.json()
      setStats(body)
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  return { stats, loading, fetchStats }
}
