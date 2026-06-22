'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Employee } from '@/types/database'

export function useEmployees(restaurantId?: string) {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEmployees = async () => {
    if (!restaurantId) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('employees')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('full_name')
    if (data) setEmployees(data as Employee[])
    setLoading(false)
  }

  useEffect(() => { fetchEmployees() }, [restaurantId])

  const createEmployee = async (employeeData: Partial<Employee>) => {
    const supabase = createClient()
    const { error } = await supabase.from('employees').insert(employeeData)
    if (error) throw error
    await fetchEmployees()
  }

  const updateEmployee = async (id: string, employeeData: Partial<Employee>) => {
    const supabase = createClient()
    const { error } = await supabase.from('employees').update(employeeData).eq('id', id)
    if (error) throw error
    await fetchEmployees()
  }

  const deactivateEmployee = async (id: string) => {
    return updateEmployee(id, { is_active: false })
  }

  return { employees, loading, createEmployee, updateEmployee, deactivateEmployee, refetch: fetchEmployees }
}
