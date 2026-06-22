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

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      <Button
        variant={selectedCategory === null ? 'default' : 'outline'}
        size="sm"
        className="shrink-0"
        onClick={() => onSelect(null)}
      >
        {t('menu.all')}
      </Button>
      {categories.map((cat) => (
        <Button
          key={cat.id}
          variant={selectedCategory === cat.id ? 'default' : 'outline'}
          size="sm"
          className="shrink-0"
          onClick={() => onSelect(cat.id)}
        >
          {cat.icon} {getDisplayName(cat)}
        </Button>
      ))}
    </div>
  )
}
