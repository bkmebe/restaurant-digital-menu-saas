'use client'

import { useState, useCallback } from 'react'

export interface FaydaVerificationRecord {
  id: string
  restaurant_id: string
  employee_id: string
  fayda_number: string
  full_name: string | null
  phone: string | null
  date_of_birth: string | null
  verification_status: 'pending' | 'verified' | 'failed' | 'expired'
  transaction_id: string | null
  verification_response: Record<string, unknown> | null
  verified_by: string | null
  verified_at: string | null
  expires_at: string | null
  created_at: string
  updated_at: string
  employee?: {
    id: string
    full_name: string
    phone: string
    fayda_number: string | null
    fayda_verified: boolean
    fayda_verified_at: string | null
  }
}

export function useFaydaVerifications() {
  const [data, setData] = useState<FaydaVerificationRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadVerifications = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.fetch('/api/fayda')
      if (!res.ok) {
        setError('Failed to load verifications')
        return
      }
      const body = await res.json()
      setData(body.data || [])
    } catch {
      setError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, error, fetch: loadVerifications }
}

export function useFaydaVerify() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const verify = useCallback(async (employeeId: string, faydaNumber: string): Promise<FaydaVerificationRecord | null> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/fayda', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee_id: employeeId, fayda_number: faydaNumber }),
      })
      const body = await res.json()
      if (!res.ok) {
        setError(body.error?.message || 'Verification failed')
        return null
      }
      return body.data
    } catch {
      setError('Network error')
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const confirmVerify = useCallback(async (verificationId: string): Promise<boolean> => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/fayda/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: verificationId }),
      })
      if (!res.ok) {
        const body = await res.json()
        setError(body.error?.message || 'Confirmation failed')
        return false
      }
      return true
    } catch {
      setError('Network error')
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { verify, confirmVerify, loading, error, clearError: () => setError(null) }
}

export function useEmployeeFayda() {
  const [data, setData] = useState<FaydaVerificationRecord[]>([])
  const [loading, setLoading] = useState(false)

  const fetchByEmployee = useCallback(async (employeeId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/fayda/employee/${employeeId}`)
      if (!res.ok) return
      const body = await res.json()
      setData(body.data || [])
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  return { data, loading, fetchByEmployee }
}
