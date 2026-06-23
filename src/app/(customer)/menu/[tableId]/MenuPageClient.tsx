'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MenuItem, Category, PaymentConfig } from '@/types/database'
import { SearchBar } from '@/components/customer/search-bar'
import { CategoryFilter } from '@/components/customer/category-filter'
import { MenuGrid } from '@/components/customer/menu-grid'
import { ServiceRequestButtons } from '@/components/customer/service-request-buttons'
import { PaymentMethodsDisplay } from '@/components/customer/payment-methods-display'
import { CartFAB } from '@/components/cart/cart-fab'
import { CartDrawer } from '@/components/cart/cart-drawer'
import { CartProvider } from '@/hooks/use-cart'
import { useLanguage } from '@/hooks/use-language'
import { APP_NAME } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'

interface TableData {
  id: string
  restaurant_id: string
  restaurant: { name: string } | null
}

export default function MenuPageClient({ table }: { table: TableData }) {
  const router = useRouter()
  const tableId = table.id
  const { t, locale } = useLanguage()

  const [restaurantId, setRestaurantId] = useState<string | null>(table.restaurant_id)
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [restaurantName, setRestaurantName] = useState(table.restaurant?.name || '')
  const [cartOpen, setCartOpen] = useState(false)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()
      const rid = table.restaurant_id

      const [catResult, itemResult, payResult] = await Promise.all([
        supabase.from('categories').select('*').eq('restaurant_id', rid).eq('is_active', true).order('sort_order'),
        supabase.from('menu_items').select('*').eq('restaurant_id', rid).eq('is_available', true).order('sort_order'),
        supabase.from('payment_configs').select('*').eq('restaurant_id', rid).eq('is_active', true).order('sort_order'),
      ])

      if (catResult.data) setCategories(catResult.data as Category[])
      if (itemResult.data) setItems(itemResult.data as MenuItem[])
      if (payResult.data) setPaymentConfigs(payResult.data as PaymentConfig[])
      setLoading(false)
    }
    loadData()
  }, [table.restaurant_id])

  const filteredItems = items.filter((item) => {
    if (selectedCategory && item.category_id !== selectedCategory) return false
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        item.name.toLowerCase().includes(q) ||
        item.name_am.includes(q) ||
        item.name_om.toLowerCase().includes(q)
      )
    }
    return true
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-11 w-full rounded-xl" />
        <Skeleton className="h-9 w-64 rounded-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card overflow-hidden">
              <Skeleton className="aspect-[4/3] rounded-none" />
              <div className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-4xl mx-auto p-4 space-y-6 animate-fade-in">
        <header className="flex items-center justify-between pt-2">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold tracking-tight">{restaurantName || APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">{t('table.number', { number: tableId.slice(0, 8).toUpperCase() })}</p>
          </div>
        </header>

        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <div className="animate-slide-up">
          <MenuGrid items={filteredItems} loading={false} />
        </div>

        {categories.length > 0 && items.length > 0 && (
          <div className="text-center text-xs text-muted-foreground pb-2">
            {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
          </div>
        )}

        <section className="border-t border-border/50 pt-6 space-y-4">
          <ServiceRequestButtons tableId={tableId} restaurantId={restaurantId || ''} />
        </section>

        <section className="border-t border-border/50 pt-6 pb-20">
          <PaymentMethodsDisplay configs={paymentConfigs} />
        </section>
      </div>

      <CartFAB onClick={() => setCartOpen(true)} />
      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={() => {
          setCartOpen(false)
          router.push(`/cart?tableId=${tableId}`)
        }}
      />
    </div>
  )
}
