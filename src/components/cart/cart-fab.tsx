'use client'

import { useCart } from '@/hooks/use-cart'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/format'

interface CartFABProps {
  onClick: () => void
}

export function CartFAB({ onClick }: CartFABProps) {
  const { itemCount, subtotal } = useCart()

  if (itemCount === 0) return null

  return (
    <Button
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 shadow-lg gap-3 h-12 px-6 rounded-full"
      size="lg"
      onClick={onClick}
    >
      <ShoppingCart className="h-5 w-5" />
      <span className="font-semibold">View Cart ({itemCount})</span>
      <Badge variant="secondary" className="ml-1">{formatCurrency(subtotal)}</Badge>
    </Button>
  )
}
