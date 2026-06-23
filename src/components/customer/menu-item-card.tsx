'use client'

import { useLanguage } from '@/hooks/use-language'
import { MenuItem } from '@/types/database'
import { formatCurrency } from '@/lib/utils/format'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AddToCartButton } from '@/components/cart/add-to-cart-button'
import { cn } from '@/lib/utils/cn'

interface MenuItemCardProps {
  item: MenuItem
}

export function MenuItemCard({ item }: MenuItemCardProps) {
  const { locale, t } = useLanguage()

  const displayName = locale === 'am' ? item.name_am : locale === 'om' ? item.name_om : item.name
  const displayDescription = locale === 'am' ? item.description_am : locale === 'om' ? item.description_om : item.description

  return (
    <Card className={cn(
      "overflow-hidden group transition-all duration-300",
      "hover:shadow-lg hover:-translate-y-0.5",
      "border-border/50"
    )}>
      {item.image_url ? (
        <div className="aspect-[4/3] relative overflow-hidden bg-muted">
          <img
            src={item.image_url}
            alt={displayName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
          <span className="text-4xl text-muted-foreground/30">&nbsp;</span>
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-base truncate">{displayName}</h3>
            {displayDescription && (
              <p className="text-sm text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{displayDescription}</p>
            )}
          </div>
          <Badge variant="secondary" className="shrink-0 mt-0.5 font-mono text-xs">
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
