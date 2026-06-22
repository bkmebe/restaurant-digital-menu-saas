'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { categorySchema } from '@/lib/utils/validators'
import { CategoryFormData } from '@/types/menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface CategoryFormProps {
  onSubmit: (data: CategoryFormData) => Promise<void>
  defaultValues?: Partial<CategoryFormData>
  loading?: boolean
}

export function CategoryForm({ onSubmit, defaultValues, loading }: CategoryFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: '', name_am: '', name_om: '', icon: '📋', sort_order: 0, is_active: true, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name (English)</Label>
          <Input id="name" {...register('name')} />
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="icon">Icon (emoji)</Label>
          <Input id="icon" {...register('icon')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input id="sort_order" type="number" {...register('sort_order', { valueAsNumber: true })} />
        </div>
      </div>
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Category'}
      </Button>
    </form>
  )
}
