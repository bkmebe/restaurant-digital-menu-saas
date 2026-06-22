'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Table as TableType } from '@/types/database'

export function useTables(restaurantId?: string) {
  const [tables, setTables] = useState<TableType[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTables = async () => {
    if (!restaurantId) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('tables')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_number')
    if (data) setTables(data as TableType[])
    setLoading(false)
  }

  useEffect(() => {
    fetchTables()
  }, [restaurantId])

  const createTable = async (tableData: Partial<TableType>) => {
    const supabase = createClient()
    const { error } = await supabase.from('tables').insert(tableData)
    if (error) throw error
    await fetchTables()
  }

  const updateTable = async (id: string, tableData: Partial<TableType>) => {
    const supabase = createClient()
    const { error } = await supabase.from('tables').update(tableData).eq('id', id)
    if (error) throw error
    await fetchTables()
  }

  const deleteTable = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('tables').delete().eq('id', id)
    if (error) throw error
    await fetchTables()
  }

  return { tables, loading, createTable, updateTable, deleteTable, refetch: fetchTables }
}
