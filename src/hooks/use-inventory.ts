'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Ingredient, StockItem, StockMovement, Supplier, PurchaseOrder, WastageRecord, LowStockAlert } from '@/types/inventory'

export function useIngredients(restaurantId?: string) {
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase.from('ingredients').select('*, unit:units_of_measure(*)').eq('restaurant_id', restaurantId).eq('is_active', true).order('name')
    if (data) setIngredients(data as unknown as Ingredient[])
    setLoading(false)
  }, [restaurantId])

  useEffect(() => { fetch() }, [fetch])
  return { ingredients, loading, refetch: fetch }
}

export function useStockItems(restaurantId?: string) {
  const [stock, setStock] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase.from('stock_items').select('*, ingredient:ingredients(*)').eq('restaurant_id', restaurantId).order('ingredient_id')
    if (data) setStock(data as unknown as StockItem[])
    setLoading(false)
  }, [restaurantId])

  useEffect(() => { fetch() }, [fetch])
  return { stock, loading, refetch: fetch }
}

export function useStockMovements(restaurantId?: string, ingredientId?: string) {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return }
    const supabase = createClient()
    let query = supabase.from('stock_movements').select('*, ingredient:ingredients(*)').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(100)
    if (ingredientId) query = query.eq('ingredient_id', ingredientId)
    const { data } = await query
    if (data) setMovements(data as unknown as StockMovement[])
    setLoading(false)
  }, [restaurantId, ingredientId])

  useEffect(() => { fetch() }, [fetch])
  return { movements, loading, refetch: fetch }
}

export function useSuppliers(restaurantId?: string) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase.from('suppliers').select('*').eq('restaurant_id', restaurantId).eq('is_active', true).order('name')
    if (data) setSuppliers(data as Supplier[])
    setLoading(false)
  }, [restaurantId])

  useEffect(() => { fetch() }, [fetch])
  return { suppliers, loading, refetch: fetch }
}

export function usePurchaseOrders(restaurantId?: string) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase.from('purchase_orders').select('*, supplier:suppliers(*), items:purchase_order_items(*, ingredient:ingredients(*))').eq('restaurant_id', restaurantId).order('created_at', { ascending: false })
    if (data) setOrders(data as unknown as PurchaseOrder[])
    setLoading(false)
  }, [restaurantId])

  useEffect(() => { fetch() }, [fetch])
  return { orders, loading, refetch: fetch }
}

export function useLowStockAlerts(restaurantId?: string) {
  const [alerts, setAlerts] = useState<LowStockAlert[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!restaurantId) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase.from('low_stock_alerts').select('*, ingredient:ingredients(*)').eq('restaurant_id', restaurantId).eq('is_resolved', false).order('created_at', { ascending: false })
    if (data) setAlerts(data as unknown as LowStockAlert[])
    setLoading(false)
  }, [restaurantId])

  useEffect(() => { fetch() }, [fetch])
  return { alerts, loading, refetch: fetch }
}
