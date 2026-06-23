'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/hooks/use-language'
import { Employee } from '@/types/database'
import { EmployeeForm } from '@/components/admin/employee-form'
import { EmployeeFormData } from '@/types/employee'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function EditEmployeePage() {
  const { t } = useLanguage()
  const router = useRouter()
  const params = useParams()
  const [employee, setEmployee] = useState<Employee | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    supabase.from('employees').select('*').eq('id', params.id).single()
      .then(({ data }) => {
        if (data) setEmployee(data as Employee)
        setLoading(false)
      })
  }, [params.id])

  const handleSubmit = async (data: EmployeeFormData) => {
    setSaving(true)
    const supabase = createClient()
    const { password, ...updateData } = data
    const { error } = await supabase.from('employees').update(updateData).eq('id', params.id)
    if (!error) router.push('/dashboard/admin/employees')
    else console.error(error)
    setSaving(false)
  }

  if (loading) return <LoadingSpinner size="lg" />

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">{t('admin.employee.editTitle')}</h1>
      <EmployeeForm
        onSubmit={handleSubmit}
        defaultValues={employee ? {
          full_name: employee.full_name,
          phone: employee.phone,
          email: employee.email,
          role: employee.role as EmployeeFormData['role'],
          national_id: employee.national_id || '',
          salary: Number(employee.salary),
          hire_date: employee.hire_date,
        } : undefined}
        loading={saving}
      />
    </div>
  )
}
