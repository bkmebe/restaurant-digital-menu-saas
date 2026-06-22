'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PaymentConfig } from '@/types/database'

export function usePaymentConfigs(restaurantId?: string) {
  const [configs, setConfigs] = useState<PaymentConfig[]>([])
  const [loading, setLoading] = useState(true)

  const fetchConfigs = async () => {
    if (!restaurantId) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase
      .from('payment_configs')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order')
    if (data) setConfigs(data as PaymentConfig[])
    setLoading(false)
  }

  useEffect(() => { fetchConfigs() }, [restaurantId])

  const createConfig = async (config: Partial<PaymentConfig>) => {
    const supabase = createClient()
    const { error } = await supabase.from('payment_configs').insert(config)
    if (error) throw error
    await fetchConfigs()
  }

  const updateConfig = async (id: string, config: Partial<PaymentConfig>) => {
    const supabase = createClient()
    const { error } = await supabase.from('payment_configs').update(config).eq('id', id)
    if (error) throw error
    await fetchConfigs()
  }

  const deleteConfig = async (id: string) => {
    const supabase = createClient()
    const { error } = await supabase.from('payment_configs').delete().eq('id', id)
    if (error) throw error
    await fetchConfigs()
  }

  return { configs, loading, createConfig, updateConfig, deleteConfig, refetch: fetchConfigs }
}
