'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useSuppliers } from '@/hooks/use-inventory'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'

export default function SuppliersPage() {
  const { profile } = useAuth()
  const { suppliers, refetch } = useSuppliers(profile?.restaurant_id)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('suppliers').insert({ restaurant_id: profile?.restaurant_id, name, phone })
    setName(''); setPhone('')
    setShowForm(false)
    setSaving(false)
    await refetch()
  }

  const columns: Column[] = [
    { key: 'name', header: 'Name' },
    { key: 'contact_person', header: 'Contact' },
    { key: 'phone', header: 'Phone' },
    { key: 'payment_terms', header: 'Terms' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Suppliers</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Add Supplier</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} /></div>
            </div>
            <Button onClick={handleCreate} disabled={saving || !name}>Save Supplier</Button>
          </CardContent>
        </Card>
      )}

      <DataTable columns={columns} data={suppliers as unknown as Record<string, unknown>[]} loading={false} />
    </div>
  )
}
