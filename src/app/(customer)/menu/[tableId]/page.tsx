'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { MenuItem, Category, PaymentConfig } from '@/types/database'
import { LanguageSwitcher } from '@/components/customer/language-switcher'
import { SearchBar } from '@/components/customer/search-bar'
import { CategoryFilter } from '@/components/customer/category-filter'
import { MenuGrid } from '@/components/customer/menu-grid'
import { ServiceRequestButtons } from '@/components/customer/service-request-buttons'
import { PaymentMethodsDisplay } from '@/components/customer/payment-methods-display'
import { AddToCartButton } from '@/components/cart/add-to-cart-button'
import { CartFAB } from '@/components/cart/cart-fab'
import { CartDrawer } from '@/components/cart/cart-drawer'
import { CartProvider } from '@/hooks/use-cart'
import { useLanguage } from '@/hooks/use-language'
import { APP_NAME } from '@/lib/constants'
import { Skeleton } from '@/components/ui/skeleton'

function CustomerMenuContent() {
  const params = useParams()
  const router = useRouter()
  const tableId = params.tableId as string
  const { t } = useLanguage()

  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [paymentConfigs, setPaymentConfigs] = useState<PaymentConfig[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [restaurantName, setRestaurantName] = useState('')
  const [cartOpen, setCartOpen] = useState(false)

  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadData() {
      const supabase = createClient()

      const { data: table, error: tableErr } = await supabase
        .from('tables')
        .select('*, restaurant:restaurants(*)')
        .eq('id', tableId)
        .single()

      if (tableErr || !table) {
        setError('Table not found')
        setLoading(false)
        return
      }

      const rid = table.restaurant_id
      setRestaurantId(rid)
      setRestaurantName((table.restaurant as { name: string })?.name || '')

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
  }, [tableId])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="text-6xl">🪑</div>
          <h1 className="text-2xl font-bold">Table Not Found</h1>
          <p className="text-muted-foreground">
            This QR code is no longer valid. Please ask your waiter for assistance.
          </p>
        </div>
      </div>
    )
  }

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
      <div className="min-h-screen bg-background p-4 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{restaurantName || APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">Table #{tableId.slice(0, 8)}</p>
          </div>
          <LanguageSwitcher />
        </header>

        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        <CategoryFilter
          categories={categories}
          selectedCategory={selectedCategory}
          onSelect={setSelectedCategory}
        />

        <MenuGrid items={filteredItems} loading={false} />

        <section className="border-t pt-6 space-y-4">
          <ServiceRequestButtons tableId={tableId} restaurantId={restaurantId || ''} />
        </section>

        <section className="border-t pt-6">
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

export default function CustomerMenuPage() {
  return (
    <CartProvider>
      <CustomerMenuContent />
    </CartProvider>
  )
}
