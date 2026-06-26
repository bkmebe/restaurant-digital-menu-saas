'use client'

import { useState, useCallback } from 'react'
import { type BackupRecord, type BackupType } from '@/types/enterprise'

interface BackupListResponse {
  data: BackupRecord[]
  total: number
  page: number
  pageSize: number
}

export function useBackups() {
  const [data, setData] = useState<BackupRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBackups = useCallback(async (params?: {
    type?: string; status?: string; page?: number
  }) => {
    setLoading(true)
    setError(null)
    try {
      const query = new URLSearchParams()
      if (params?.type) query.set('type', params.type)
      if (params?.status) query.set('status', params.status)
      if (params?.page) query.set('page', String(params.page))

      const res = await fetch(`/api/backups?${query}`)
      const body: BackupListResponse = await res.json()
      if (!res.ok) {
        setError((body as unknown as { error: { message: string } }).error?.message || 'Failed to fetch backups')
        return
      }
      setData(body.data || [])
      setTotal(body.total || 0)
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  const createBackup = useCallback(async (backup_type?: BackupType, notes?: string): Promise<BackupRecord | null> => {
    setError(null)
    try {
      const res = await fetch('/api/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backup_type, notes }),
      })
      const body = await res.json()
      if (!res.ok) { setError(body.error?.message); return null }
      return body.data
    } catch {
      setError('Network error')
      return null
    }
  }, [])

  const updateBackup = useCallback(async (id: string, updates: Record<string, unknown>): Promise<BackupRecord | null> => {
    setError(null)
    try {
      const res = await fetch(`/api/backups/${id}`, {
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

  const deleteBackup = useCallback(async (id: string): Promise<boolean> => {
    setError(null)
    try {
      const res = await fetch(`/api/backups/${id}`, { method: 'DELETE' })
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

  return { data, total, loading, error, fetchBackups, createBackup, updateBackup, deleteBackup }
}
