'use client'

import { useCart } from '@/hooks/use-cart'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils/format'
import { ShoppingCart, Plus, Minus, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface CartDrawerProps {
  open: boolean
  onClose: () => void
  onCheckout: () => void
}

export function CartDrawer({ open, onClose, onCheckout }: CartDrawerProps) {
  const { t } = useLanguage()
  const { items, updateQuantity, removeItem, subtotal, itemCount } = useCart()

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md bg-background shadow-xl flex flex-col animate-in slide-in-from-right">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <h2 className="font-semibold">Cart ({itemCount})</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Your cart is empty</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.menu_item_id} className="flex gap-3 p-3 rounded-lg border">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded object-cover shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-medium text-sm truncate">{item.name}</h4>
                    <span className="font-semibold text-sm shrink-0">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}>
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Badge variant="secondary" className="w-8 justify-center">{item.quantity}</Badge>
                    <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}>
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 ml-auto text-destructive" onClick={() => removeItem(item.menu_item_id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatCurrency(subtotal)}</span>
            </div>
            <Button className="w-full" size="lg" onClick={onCheckout}>
              Place Order — {formatCurrency(subtotal)}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
