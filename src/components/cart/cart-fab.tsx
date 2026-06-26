'use client'

import { useCart } from '@/hooks/use-cart'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface CartFABProps {
  onClick: () => void
}

export function CartFAB({ onClick }: CartFABProps) {
  const { itemCount, subtotal } = useCart()
  const { t } = useLanguage()

  if (itemCount === 0) return null

  return (
    <Button
      data-testid="cart-button"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 shadow-lg gap-3 h-12 px-6 rounded-full"
      size="lg"
      onClick={onClick}
    >
      <ShoppingCart className="h-5 w-5" />
      <span className="font-semibold">{t('cart.viewCart', { count: itemCount })}</span>
      <Badge data-testid="cart-badge" variant="secondary" className="ml-1">{formatCurrency(subtotal)}</Badge>
    </Button>
  )
}
