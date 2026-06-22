'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EmployeeForm } from '@/components/admin/employee-form'
import { EmployeeFormData } from '@/types/employee'

export default function NewEmployeePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (data: EmployeeFormData) => {
    setLoading(true)
    const res = await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (res.ok) router.push('/dashboard/admin/employees')
    else {
      const { error } = await res.json()
      console.error(error ?? 'Failed to create employee')
    }
    setLoading(false)
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-6">Add Employee</h1>
      <EmployeeForm onSubmit={handleSubmit} loading={loading} />
    </div>
  )
}
