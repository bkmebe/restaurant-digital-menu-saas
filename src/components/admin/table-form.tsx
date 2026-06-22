'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { tableSchema } from '@/lib/utils/validators'
import { TableFormData } from '@/types/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Employee } from '@/types/database'

interface TableFormProps {
  waiters?: Employee[]
  onSubmit: (data: TableFormData) => Promise<void>
  defaultValues?: Partial<TableFormData>
  loading?: boolean
  error?: string
}

export function TableForm({ waiters = [], onSubmit, defaultValues, loading, error }: TableFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<TableFormData>({
    resolver: zodResolver(tableSchema),
    defaultValues: { table_number: 0, capacity: 4, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="table_number">Table Number</Label>
          <Input id="table_number" type="number" {...register('table_number', { valueAsNumber: true })} />
          {errors.table_number && <p className="text-xs text-destructive">{errors.table_number.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="capacity">Capacity</Label>
          <Input id="capacity" type="number" {...register('capacity', { valueAsNumber: true })} />
          {errors.capacity && <p className="text-xs text-destructive">{errors.capacity.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="assigned_waiter_id">Assigned Waiter</Label>
          <Select
            id="assigned_waiter_id"
            {...register('assigned_waiter_id')}
            options={waiters.map(w => ({ value: w.id, label: w.full_name }))}
            placeholder="Select waiter"
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Table'}
      </Button>
    </form>
  )
}
