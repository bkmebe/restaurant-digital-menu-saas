'use client'

import { createContext, useContext, useState, useCallback, createElement, ReactNode } from 'react'
import { CartItem } from '@/types/order'

interface CartContextType {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (menuItemId: string) => void
  updateQuantity: (menuItemId: string, quantity: number) => void
  updateSpecialRequests: (menuItemId: string, requests: string) => void
  clearCart: () => void
  itemCount: number
  subtotal: number
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  updateSpecialRequests: () => {},
  clearCart: () => {},
  itemCount: 0,
  subtotal: 0,
})

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  const addItem = useCallback((item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(i => i.menu_item_id === item.menu_item_id)
      if (existing) {
        return prev.map(i =>
          i.menu_item_id === item.menu_item_id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        )
      }
      return [...prev, item]
    })
  }, [])

  const removeItem = useCallback((menuItemId: string) => {
    setItems(prev => prev.filter(i => i.menu_item_id !== menuItemId))
  }, [])

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(menuItemId)
      return
    }
    setItems(prev =>
      prev.map(i =>
        i.menu_item_id === menuItemId ? { ...i, quantity } : i
      )
    )
  }, [removeItem])

  const updateSpecialRequests = useCallback((menuItemId: string, requests: string) => {
    setItems(prev =>
      prev.map(i =>
        i.menu_item_id === menuItemId ? { ...i, special_requests: requests } : i
      )
    )
  }, [])

  const clearCart = useCallback(() => {
    setItems([])
  }, [])

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return createElement(
    CartContext.Provider,
    { value: { items, addItem, removeItem, updateQuantity, updateSpecialRequests, clearCart, itemCount, subtotal } },
    children,
  )
}

export function useCart() {
  return useContext(CartContext)
}
