'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ServiceRequest } from '@/types/database'
import { ServiceRequestFormData } from '@/types/service-request'

export function useServiceRequests(restaurantId?: string) {
  const [requests, setRequests] = useState<ServiceRequest[]>([])
  const [loading, setLoading] = useState(true)

  const fetchRequests = async () => {
    if (!restaurantId) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('service_requests')
      .select('*, table:tables(*)')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setRequests(data as unknown as ServiceRequest[])
    setLoading(false)
  }

  useEffect(() => {
    fetchRequests()

    if (!restaurantId) return
    const supabase = createClient()
    const channel = supabase
      .channel('service-requests')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'service_requests', filter: `restaurant_id=eq.${restaurantId}` },
        () => fetchRequests()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [restaurantId])

  const createRequest = async (data: ServiceRequestFormData) => {
    const supabase = createClient()
    const { error } = await supabase.from('service_requests').insert(data)
    if (error) throw error
  }

  const updateStatus = async (id: string, status: 'acknowledged' | 'resolved') => {
    const supabase = createClient()
    const updateData: Partial<ServiceRequest> = { status }
    if (status === 'resolved') updateData.resolved_at = new Date().toISOString()
    const { error } = await supabase.from('service_requests').update(updateData).eq('id', id)
    if (error) throw error
  }

  return { requests, loading, createRequest, updateStatus, refetch: fetchRequests }
}
