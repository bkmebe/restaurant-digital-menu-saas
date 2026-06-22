'use client'

import { useLanguage } from '@/hooks/use-language'
import { MenuItem } from '@/types/database'
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddToCartButton } from '@/components/cart/add-to-cart-button'

interface MenuItemCardProps {
  item: MenuItem
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { locale, t } = useLanguage()

  const displayName = locale === 'am' ? item.name_am : locale === 'om' ? item.name_om : item.name
  const displayDescription = locale === 'am' ? item.description_am : locale === 'om' ? item.description_om : item.description

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      {item.image_url && (
        <div className="aspect-video relative overflow-hidden bg-muted">
          <img src={item.image_url} alt={displayName} className="w-full h-full object-cover" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{displayName}</h3>
            {displayDescription && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{displayDescription}</p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0">
            {formatCurrency(Number(item.price))}
          </Badge>
        </div>
        <div className="mt-3">
          <AddToCartButton item={item} />
        </div>
      </CardContent>
    </Card>
  )
}
