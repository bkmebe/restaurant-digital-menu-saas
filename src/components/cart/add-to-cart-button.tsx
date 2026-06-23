'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/use-cart'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { MenuItem } from '@/types/database'
import { ShoppingCart, Check } from 'lucide-react'

interface AddToCartButtonProps {
  item: MenuItem
}

export function AddToCartButton({ item }: AddToCartButtonProps) {
  const { locale, t } = useLanguage()
  const { addItem } = useCart()
  const [quantity, setQuantity] = useState(1)
  const [requests, setRequests] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [added, setAdded] = useState(false)

  const displayName = locale === 'am' ? item.name_am : locale === 'om' ? item.name_om : item.name

  const handleAdd = () => {
    addItem({
      menu_item_id: item.id,
      name: item.name,
      name_am: item.name_am,
      name_om: item.name_om,
      price: Number(item.price),
      quantity,
      special_requests: requests,
      image_url: item.image_url || undefined,
    })
    setAdded(true)
    setTimeout(() => setAdded(false), 2000)
    setQuantity(1)
    setRequests('')
    setShowForm(false)
  }

  if (added) {
    return (
      <Button className="w-full gap-2" variant="outline" disabled>
        <Check className="h-4 w-4" /> {t('cart.added')}
      </Button>
    )
  }

  return (
    <div className="space-y-2">
      <Button className="w-full gap-2" onClick={() => setShowForm(!showForm)}>
        <ShoppingCart className="h-4 w-4" />
        {t('menu.addToOrder')}
      </Button>

      {showForm && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <Label className="text-xs">{t('cart.qty')}</Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</Button>
              <span className="w-6 text-center text-sm font-medium">{quantity}</span>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setQuantity(quantity + 1)}>+</Button>
            </div>
          </div>
          <div>
            <Label className="text-xs">{t('cart.specialRequests')}</Label>
            <Input
              placeholder={t('cart.specialRequestsPlaceholder')}
              value={requests}
              onChange={(e) => setRequests(e.target.value)}
              className="text-sm mt-1"
            />
          </div>
          <Button size="sm" className="w-full" onClick={handleAdd}>
            {t('cart.addQuantity', { quantity })}
          </Button>
        </div>
      )}
    </div>
  )
}
