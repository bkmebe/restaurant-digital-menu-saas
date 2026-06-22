'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { employeeSchema } from '@/lib/utils/validators'
import { EmployeeFormData } from '@/types/employee'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'

interface EmployeeFormProps {
  onSubmit: (data: EmployeeFormData) => Promise<void>
  defaultValues?: Partial<EmployeeFormData>
  loading?: boolean
}

export function EmployeeForm({ onSubmit, defaultValues, loading }: EmployeeFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: { full_name: '', phone: '+251', email: '', role: 'waiter', national_id: '', salary: 0, hire_date: '', ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="full_name">Full Name</Label>
          <Input id="full_name" {...register('full_name')} />
          {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="phone">Phone (+251XXXXXXXXX)</Label>
          <Input id="phone" {...register('phone')} placeholder="+251911234567" />
          {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="role">Role</Label>
          <Select
            id="role"
            {...register('role')}
            options={[
              { value: 'waiter', label: 'Waiter' },
              { value: 'cashier', label: 'Cashier' },
              { value: 'manager', label: 'Manager' },
            ]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="national_id">National ID (Fayda)</Label>
          <Input id="national_id" {...register('national_id')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="salary">Monthly Salary (ETB)</Label>
          <Input id="salary" type="number" step="0.01" {...register('salary', { valueAsNumber: true })} />
          {errors.salary && <p className="text-xs text-destructive">{errors.salary.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="hire_date">Hire Date</Label>
          <Input id="hire_date" type="date" {...register('hire_date')} />
          {errors.hire_date && <p className="text-xs text-destructive">{errors.hire_date.message}</p>}
        </div>
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Employee'}
      </Button>
    </form>
  )
}
