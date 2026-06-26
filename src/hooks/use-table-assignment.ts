'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Table } from '@/types/database'

interface Employee {
  id: string
  full_name: string
  role: string
  is_active: boolean
}

interface TableWithWaiter extends Table {
  waiter_name?: string
}

export function useTableAssignment(restaurantId?: string) {
  const [tables, setTables] = useState<TableWithWaiter[]>([])
  const [waiters, setWaiters] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return }
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()

      const [tablesRes, employeesRes] = await Promise.all([
        supabase
          .from('tables')
          .select('*, waiter:assigned_waiter_id(full_name)')
          .eq('restaurant_id', restaurantId)
          .order('table_number'),
        supabase
          .from('employees')
          .select('id, full_name, role, is_active')
          .eq('restaurant_id', restaurantId)
          .eq('role', 'waiter')
          .eq('is_active', true)
          .order('full_name'),
      ])

      if (tablesRes.error) { setError('Failed to load tables'); return }
      if (employeesRes.error) { setError('Failed to load waiters'); return }

      const mapped = (tablesRes.data || []).map(t => ({
        ...t,
        waiter_name: (t.waiter as { full_name: string } | null)?.full_name,
      })) as TableWithWaiter[]

      setTables(mapped)
      setWaiters((employeesRes.data || []) as Employee[])
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [restaurantId])

  const assignWaiter = useCallback(async (tableId: string, waiterId: string | null) => {
    setError(null)
    try {
      const res = await fetch(`/api/tables/${tableId}/assign`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ waiter_id: waiterId }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Failed to assign waiter')
        return false
      }
      await fetchData()
      return true
    } catch {
      setError('Network error')
      return false
    }
  }, [fetchData])

  const unassignWaiter = useCallback(async (tableId: string) => {
    setError(null)
    try {
      const res = await fetch(`/api/tables/${tableId}/assign`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error?.message || 'Failed to unassign waiter')
        return false
      }
      await fetchData()
      return true
    } catch {
      setError('Network error')
      return false
    }
  }, [fetchData])

  return { tables, waiters, loading, error, fetchData, assignWaiter, unassignWaiter }
}
