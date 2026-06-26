'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface Branch {
  id: string
  name: string
}

export function useBranches(organizationId: string | null) {
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBranches = useCallback(async () => {
    if (!organizationId) {
      setBranches([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const supabase = createClient()
      const { data, error: err } = await supabase
        .from('restaurants')
        .select('id, name')
        .eq('organization_id', organizationId)
        .order('name')
      if (err) throw new Error(err.message)
      setBranches(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches')
    } finally {
      setLoading(false)
    }
  }, [organizationId])

  useEffect(() => {
    fetchBranches()
  }, [fetchBranches])

  return { branches, loading, error, refetch: fetchBranches }
}
