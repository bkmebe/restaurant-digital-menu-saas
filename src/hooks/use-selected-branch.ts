'use client'

import { useState, useCallback } from 'react'

const STORAGE_KEY = 'restaurantos-selected-branch-id'

export function useSelectedBranch(defaultBranchId: string | null) {
  const [selectedBranchId, setSelectedBranchIdState] = useState<string | null>(() => {
    if (typeof window === 'undefined') return defaultBranchId
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored || defaultBranchId
  })

  const setSelectedBranchId = useCallback((id: string | null) => {
    setSelectedBranchIdState(id)
    if (typeof window !== 'undefined') {
      if (id) {
        localStorage.setItem(STORAGE_KEY, id)
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
  }, [])

  const clearSelectedBranchId = useCallback(() => {
    setSelectedBranchId(null)
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  return { selectedBranchId, setSelectedBranchId, clearSelectedBranchId }
}
