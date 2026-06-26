'use client'

import { useLanguage } from '@/hooks/use-language'
import { Category } from '@/types/database'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

interface CategoryFilterProps {
  categories: Category[]
  selectedCategory: string | null
  onSelect: (categoryId: string | null) => void
}

export function CategoryFilter({ categories, selectedCategory, onSelect }: CategoryFilterProps) {
  const { locale, t } = useLanguage()

  const getDisplayName = (cat: Category) =>
    locale === 'am' ? cat.name_am : locale === 'om' ? cat.name_om : cat.name

  if (categories.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none -mx-1 px-1">
      <Button
        variant={selectedCategory === null ? 'default' : 'outline'}
        size="sm"
        className="shrink-0 rounded-full text-xs font-medium"
        onClick={() => onSelect(null)}
      >
        {t('menu.all')}
      </Button>
      {categories.map((cat) => (
        <Button
          key={cat.id}
          data-testid="category"
          variant={selectedCategory === cat.id ? 'default' : 'outline'}
          size="sm"
          className={cn(
            "shrink-0 rounded-full text-xs font-medium",
            selectedCategory === cat.id ? '' : 'hover:bg-muted/80'
          )}
          onClick={() => onSelect(cat.id)}
        >
          {cat.icon && <span className="mr-1">{cat.icon}</span>}
          {getDisplayName(cat)}
        </Button>
      ))}
    </div>
  )
}
