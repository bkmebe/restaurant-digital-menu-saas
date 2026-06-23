'use client'

import { MenuItem } from '@/types/database'
import { MenuItemCard } from './menu-item-card'
import { EmptyState } from '@/components/shared/empty-state'
import { useLanguage } from '@/hooks/use-language'
import { UtensilsCrossed, SearchX } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

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
    )
  }

  if (items.length === 0) {
    return (
      <div className="py-12">
        <EmptyState
          icon={<SearchX className="h-12 w-12" />}
          title={t('menu.noItems')}
          description={t('menu.adjustSearch')}
        />
      </div>
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
