'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useIngredients } from '@/hooks/use-inventory'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Plus } from 'lucide-react'

export default function IngredientsPage() {
  const { profile } = useAuth()
  const { ingredients, refetch } = useIngredients(profile?.restaurant_id)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [nameAm, setNameAm] = useState('')
  const [nameOm, setNameOm] = useState('')
  const [category, setCategory] = useState('')
  const [saving, setSaving] = useState(false)

  const handleCreate = async () => {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('ingredients').insert({ restaurant_id: profile?.restaurant_id, name, name_am: nameAm, name_om: nameOm, category })
    setName(''); setNameAm(''); setNameOm(''); setCategory('')
    setShowForm(false)
    setSaving(false)
    await refetch()
  }

  const columns: Column[] = [
    { key: 'name', header: 'Name' },
    { key: 'category', header: 'Category' },
    { key: 'unit', header: 'Unit', render: (item) => (item.unit as { symbol: string })?.symbol || '-' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Ingredients</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Add Ingredient</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Name (English)</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Name (Amharic)</Label>
                <Input value={nameAm} onChange={e => setNameAm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Name (Oromo)</Label>
                <Input value={nameOm} onChange={e => setNameOm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={category} onChange={e => setCategory(e.target.value)} options={[
                  { value: 'produce', label: 'Produce' },
                  { value: 'meat', label: 'Meat' },
                  { value: 'dairy', label: 'Dairy' },
                  { value: 'dry', label: 'Dry Goods' },
                  { value: 'beverage', label: 'Beverage' },
                  { value: 'other', label: 'Other' },
                ]} placeholder="Select category" />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving || !name}>Save Ingredient</Button>
          </CardContent>
        </Card>
      )}

      <DataTable columns={columns} data={ingredients as unknown as Record<string, unknown>[]} loading={false} />
    </div>
  )
}
