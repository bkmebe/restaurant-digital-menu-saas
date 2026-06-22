'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Trash2, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'

interface MenuItem {
  name: string
  nameAm: string
  nameOm: string
  price: number
  description: string
}

interface Category {
  name: string
  nameAm: string
  nameOm: string
  icon: string
  items: MenuItem[]
}

interface MenuStepProps {
  initialCount: number
  categories: Category[]
  setCategories: (cats: Category[] | ((prev: Category[]) => Category[])) => void
  onComplete: () => void
}

const CATEGORY_ICONS = ['📋', '🍛', '🥩', '🥗', '🍲', '🥘', '🍝', '🌯', '🥟', '🍕', '🥪', '🍜', '🍣', '🥤', '🍰', '🍦']

export function MenuStep({ initialCount, categories, setCategories, onComplete }: MenuStepProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [expandedCat, setExpandedCat] = useState<number | null>(0)

  const addCategory = () => {
    setCategories((prev: Category[]) => [...prev, {
      name: '',
      nameAm: '',
      nameOm: '',
      icon: CATEGORY_ICONS[prev.length % CATEGORY_ICONS.length] ?? '📋',
      items: [],
    }])
    setExpandedCat(categories.length)
  }

  const removeCategory = (i: number) => {
    setCategories((prev: Category[]) => prev.filter((_: Category, idx: number) => idx !== i))
    setExpandedCat(null)
  }

  const updateCategory = (i: number, field: keyof Category, value: string) => {
    setCategories((prev: Category[]) => prev.map((c: Category, idx: number) => idx === i ? { ...c, [field]: value } : c))
  }

  const addItem = (catIdx: number) => {
    setCategories((prev: Category[]) => prev.map((c: Category, idx: number) => idx === catIdx ? {
      ...c,
      items: [...c.items, { name: '', nameAm: '', nameOm: '', price: 0, description: '' }],
    } : c))
  }

  const removeItem = (catIdx: number, itemIdx: number) => {
    setCategories((prev: Category[]) => prev.map((c: Category, idx: number) => idx === catIdx ? {
      ...c,
      items: c.items.filter((_: MenuItem, iidx: number) => iidx !== itemIdx),
    } : c))
  }

  const updateItem = (catIdx: number, itemIdx: number, field: string, value: string | number) => {
    setCategories((prev: Category[]) => prev.map((c: Category, idx: number) => idx === catIdx ? {
      ...c,
      items: c.items.map((item: MenuItem, iidx: number) => iidx === itemIdx ? { ...item, [field]: value as never } : item),
    } : c))
  }

  const handleSubmit = async () => {
    if (categories.length === 0) return
    setSaving(true)
    try {
      await fetch('/api/onboarding/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories }),
      })
      setSaved(true)
      setTimeout(onComplete, 800)
    } catch {
      // ignore
    }
    setSaving(false)
  }

  const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0)

  if (saved) {
    return (
      <div className="text-center space-y-4 py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold">Menu Created!</h2>
        <p className="text-muted-foreground">
          {categories.length} categories with {totalItems} items
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Add Your Menu</h2>
        <p className="text-sm text-muted-foreground">
          Create categories and add menu items. You can always add more later.
        </p>
      </div>

      {categories.map((cat, catIdx) => (
        <Card key={catIdx} className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">{cat.icon || '📋'}</span>
              <span className="font-medium">{cat.name || `Category ${catIdx + 1}`}</span>
              {cat.items.length > 0 && (
                <Badge variant="outline">{cat.items.length} items</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setExpandedCat(expandedCat === catIdx ? null : catIdx)}
              >
                {expandedCat === catIdx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeCategory(catIdx)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {expandedCat === catIdx && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Name (English)</Label>
                  <Input value={cat.name} onChange={(e) => updateCategory(catIdx, 'name', e.target.value)} placeholder="e.g. Main Dishes" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Name (አማርኛ)</Label>
                  <Input value={cat.nameAm} onChange={(e) => updateCategory(catIdx, 'nameAm', e.target.value)} placeholder="ዋና ምግቦች" className="h-9" />
                </div>
                <div>
                  <Label className="text-xs">Name (Afaan Oromoo)</Label>
                  <Input value={cat.nameOm} onChange={(e) => updateCategory(catIdx, 'nameOm', e.target.value)} placeholder="e.g. Nyaata Guddaa" className="h-9" />
                </div>
              </div>

              {cat.items.map((item, itemIdx) => (
                <Card key={itemIdx} className="p-3 bg-muted/30">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateItem(catIdx, itemIdx, 'name', e.target.value)}
                        placeholder="Item name (English)"
                        className="h-9"
                      />
                      <Input
                        type="number"
                        value={item.price || ''}
                        onChange={(e) => updateItem(catIdx, itemIdx, 'price', parseFloat(e.target.value) || 0)}
                        placeholder="Price (ETB)"
                        className="h-9"
                      />
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-destructive" onClick={() => removeItem(catIdx, itemIdx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}

              <Button variant="ghost" size="sm" onClick={() => addItem(catIdx)}>
                <Plus className="h-4 w-4 mr-1" /> Add Item
              </Button>
            </div>
          )}
        </Card>
      ))}

      <Button variant="outline" onClick={addCategory} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Category
      </Button>

      {categories.length > 0 && (
        <Button className="w-full" onClick={handleSubmit} disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
          Save Menu & Continue
        </Button>
      )}
    </div>
  )
}
