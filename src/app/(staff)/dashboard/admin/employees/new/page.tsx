'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { EmployeeForm } from '@/components/admin/employee-form'
import { EmployeeFormData } from '@/types/employee'

export default function NewEmployeePage() {
  const router = useRouter()
  const { profile } = useAuth()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data: EmployeeFormData) => {
    setLoading(true)
    const supabase = createClient()
    const restaurantCode = profile?.restaurant_id?.slice(0, 4).toUpperCase() || 'XXXX'
    const digitalEmployeeId = `RMD-${restaurantCode}-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase()}`

    const { error } = await supabase.from('employees').insert({
      ...data,
      restaurant_id: profile?.restaurant_id,
      digital_employee_id: digitalEmployeeId,
    })

    if (!error) router.push('/dashboard/admin/employees')
    else console.error(error)
    setLoading(false)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add Employee</h1>
      <EmployeeForm onSubmit={handleSubmit} loading={loading} />
    </div>
  )
}
