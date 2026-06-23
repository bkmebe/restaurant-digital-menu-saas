'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useCart } from '@/hooks/use-cart'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/format'
import { ArrowLeft, ShoppingBag, Minus, Plus, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'

function CartPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tableId = searchParams.get('tableId') || ''
  const { t } = useLanguage()
  const { items, updateQuantity, removeItem, subtotal, clearCart } = useCart()
  const [customerName, setCustomerName] = useState('')
  const [specialInstructions, setSpecialInstructions] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [orderId, setOrderId] = useState('')

  const handleSubmit = async () => {
    if (items.length === 0) return
    setSubmitting(true)
    setError('')

    try {
      const supabase = createClient()

      // Get restaurant_id from table
      const { data: table } = await supabase.from('tables').select('restaurant_id').eq('id', tableId).single()
      if (!table) throw new Error('Table not found')

      // Create order
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        restaurant_id: table.restaurant_id,
        table_id: tableId,
        customer_name: customerName || 'Guest',
        status: 'pending',
        total_amount: subtotal,
        special_instructions: specialInstructions,
      }).select().single()

      if (orderError) throw orderError

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: item.price,
        subtotal: item.price * item.quantity,
        special_requests: item.special_requests,
      }))

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems)
      if (itemsError) throw itemsError

      setOrderId(order.id)
      setSuccess(true)
      clearCart()
    } catch (err) {
      setError(t('order.placeFailed'))
    }
    setSubmitting(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm text-center">
          <CardContent className="p-8 space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <ShoppingBag className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">{t('cart.orderPlacedSuccess')}</h2>
            <p className="text-muted-foreground">{t('cart.sentToKitchen')}</p>
            <Badge variant="secondary" className="text-sm">{t('cart.orderNumber')}{orderId.slice(0, 8)}</Badge>
            <div className="flex flex-col gap-3 pt-4">
              <Button onClick={() => router.push(`/orders/${orderId}`)}>
                {t('cart.trackOrder')}
              </Button>
              <Button variant="outline" onClick={() => router.push(`/menu/${tableId}`)}>
                {t('cart.backToMenu')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto p-4 space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/menu/${tableId}`}>
            <Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button>
          </Link>
          <h1 className="text-xl font-bold">{t('cart.yourOrder')}</h1>
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center space-y-4">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground" />
              <p className="text-muted-foreground">{t('cart.yourCartEmpty')}</p>
              <Link href={`/menu/${tableId}`}>
                <Button>{t('cart.browseMenu')}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card>
              <CardHeader><CardTitle>{t('cart.itemsCount', { count: items.length })}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {items.map((item) => (
                  <div key={item.menu_item_id} className="flex gap-3 p-2 rounded-lg border">
                    {item.image_url && (
                      <img src={item.image_url} alt={item.name} className="w-14 h-14 rounded object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between">
                        <p className="font-medium text-sm truncate">{item.name}</p>
                        <span className="font-semibold text-sm">{formatCurrency(item.price * item.quantity)}</span>
                      </div>
                      {item.special_requests && (
                        <p className="text-xs text-muted-foreground italic mt-0.5">{item.special_requests}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-6 w-6" onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto text-destructive" onClick={() => removeItem(item.menu_item_id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>{t('cart.orderDetails')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">{t('cart.yourName')}</Label>
                  <Input id="name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder={t('cart.nameForOrder')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="instructions">{t('cart.specialInstructions')}</Label>
                  <Input id="instructions" value={specialInstructions} onChange={(e) => setSpecialInstructions(e.target.value)} placeholder={t('cart.specialRequestsKitchen')} />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between text-lg font-bold">
              <span>{t('common.total')}</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button className="w-full" size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('cart.placingOrder')}</> : t('cart.placeOrderButton', { amount: formatCurrency(subtotal) })}
            </Button>
          </>
        )}
      </div>
    </div>
  )
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
      <CartPageContent />
    </Suspense>
  )
}
