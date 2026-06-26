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
    defaultValues: { full_name: '', phone: '+251', email: '', password: '', role: 'waiter', national_id: '', fayda_number: '', salary: 0, hire_date: '', ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Login Credentials</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email (used for login)</Label>
            <Input id="email" type="email" data-testid="employee-email-input" {...register('email')} />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
        </div>
      </div>

      <div className="rounded-lg border p-4 space-y-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Staff Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="full_name">Full Name</Label>
            <Input id="full_name" data-testid="employee-name-input" {...register('full_name')} />
            {errors.full_name && <p className="text-xs text-destructive">{errors.full_name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone (+251XXXXXXXXX)</Label>
            <Input id="phone" data-testid="employee-phone-input" {...register('phone')} placeholder="+251911234567" />
            {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
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
                { value: 'kitchen_staff', label: 'Kitchen Staff' },
                { value: 'inventory_manager', label: 'Inventory Manager' },
              ]}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="fayda_number">Fayda Number</Label>
            <Input id="fayda_number" {...register('fayda_number')} placeholder="Optional" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="national_id">National ID</Label>
            <Input id="national_id" {...register('national_id')} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="salary">Monthly Salary (ETB)</Label>
            <Input id="salary" type="number" step="0.01" data-testid="employee-salary-input" {...register('salary', { valueAsNumber: true })} />
            {errors.salary && <p className="text-xs text-destructive">{errors.salary.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="hire_date">Hire Date</Label>
            <Input id="hire_date" type="date" {...register('hire_date')} />
            {errors.hire_date && <p className="text-xs text-destructive">{errors.hire_date.message}</p>}
          </div>
        </div>
      </div>

      <Button type="submit" data-testid="employee-submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Employee'}
      </Button>
    </form>
  )
}
