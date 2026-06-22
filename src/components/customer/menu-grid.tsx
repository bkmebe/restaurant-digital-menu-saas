'use client'

import { MenuItem } from '@/types/database'
import { MenuItemCard } from './menu-item-card'
import { EmptyState } from '@/components/shared/empty-state'
import { useLanguage } from '@/hooks/use-language'
import { UtensilsCrossed } from 'lucide-react'

interface MenuGridProps {
  items: MenuItem[]
  loading?: boolean
}

export function MenuGrid({ items, loading }: MenuGridProps) {
  const { t } = useLanguage()

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-4 space-y-3">
            <div className="aspect-video bg-muted animate-pulse rounded-md" />
            <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
            <div className="h-3 bg-muted animate-pulse rounded w-1/2" />
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="h-12 w-12" />}
        title={t('menu.noItems')}
      />
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <MenuItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
