'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { menuItemSchema } from '@/lib/utils/validators'
import { MenuItemFormData } from '@/types/menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ImageUpload } from '@/components/shared/image-upload'
import { Category } from '@/types/database'

interface MenuItemFormProps {
  categories: Category[]
  onSubmit: (data: MenuItemFormData) => Promise<void>
  defaultValues?: Partial<MenuItemFormData>
  loading?: boolean
}

export function MenuItemForm({ categories, onSubmit, defaultValues, loading }: MenuItemFormProps) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: {
      name: '', name_am: '', name_om: '',
      description: '', description_am: '', description_om: '',
      price: 0, is_available: true, is_featured: false, sort_order: 0,
      ...defaultValues,
    },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name (English)</Label>
          <Input id="name" data-testid="menu-item-name-input" {...register('name')} />
          {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name_am">Name (Amharic)</Label>
          <Input id="name_am" {...register('name_am')} />
          {errors.name_am && <p className="text-xs text-destructive">{errors.name_am.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="name_om">Name (Afaan Oromo)</Label>
          <Input id="name_om" {...register('name_om')} />
          {errors.name_om && <p className="text-xs text-destructive">{errors.name_om.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="description">Description (English)</Label>
          <Input id="description" {...register('description')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description_am">Description (Amharic)</Label>
          <Input id="description_am" {...register('description_am')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description_om">Description (Afaan Oromo)</Label>
          <Input id="description_om" {...register('description_om')} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price (ETB)</Label>
          <Input id="price" type="number" step="0.01" data-testid="menu-item-price-input" {...register('price', { valueAsNumber: true })} />
          {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="category_id">Category</Label>
          <Select
            id="category_id"
            {...register('category_id')}
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            placeholder="Select category"
          />
          {errors.category_id && <p className="text-xs text-destructive">{errors.category_id.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input id="sort_order" type="number" {...register('sort_order', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('is_available')} />
          <span className="text-sm">Available</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" {...register('is_featured')} />
          <span className="text-sm">Featured</span>
        </label>
      </div>

      <div className="space-y-2">
        <Label>Image</Label>
        <ImageUpload
          bucket="menu-images"
          path="menu"
          onUpload={(url) => setValue('image_url', url)}
          currentImage={defaultValues?.image_url}
        />
      </div>

      <Button type="submit" data-testid="menu-item-submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Item'}
      </Button>
    </form>
  )
}
