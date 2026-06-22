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
import { formatDateTime } from '@/lib/utils/format'
import { Plus } from 'lucide-react'
import { useEffect } from 'react'
import { WastageRecord } from '@/types/inventory'

export default function WastagePage() {
  const { profile } = useAuth()
  const { ingredients } = useIngredients(profile?.restaurant_id)
  const [records, setRecords] = useState<WastageRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [ingredientId, setIngredientId] = useState('')
  const [quantity, setQuantity] = useState(0)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchRecords = async () => {
    if (!profile?.restaurant_id) { setLoading(false); return }
    const supabase = createClient()
    const { data } = await supabase.from('wastage_records').select('*, ingredient:ingredients(*)').eq('restaurant_id', profile.restaurant_id).order('created_at', { ascending: false })
    if (data) setRecords(data as unknown as WastageRecord[])
    setLoading(false)
  }

  useEffect(() => { fetchRecords() }, [profile?.restaurant_id])

  const handleCreate = async () => {
    setSaving(true)
    const supabase = createClient()

    // Create wastage record
    await supabase.from('wastage_records').insert({
      restaurant_id: profile?.restaurant_id,
      ingredient_id: ingredientId,
      quantity,
      reason,
    })

    // Deduct from stock
    await supabase.from('stock_items').update({
      current_quantity: supabase.rpc('decrement', { x: quantity })
    }).eq('ingredient_id', ingredientId)

    // Log movement
    await supabase.from('stock_movements').insert({
      restaurant_id: profile?.restaurant_id,
      ingredient_id: ingredientId,
      quantity: -quantity,
      type: 'wastage',
      reference_type: 'wastage',
      notes: reason,
    })

    setShowForm(false)
    setIngredientId('')
    setQuantity(0)
    setReason('')
    setSaving(false)
    await fetchRecords()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Wastage Tracking</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />Record Wastage</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Ingredient</Label>
                <Select value={ingredientId} onChange={e => setIngredientId(e.target.value)} options={ingredients.map(i => ({ value: i.id, label: i.name }))} placeholder="Select" />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input type="number" value={quantity || ''} onChange={e => setQuantity(Number(e.target.value))} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>Reason</Label>
                <Select value={reason} onChange={e => setReason(e.target.value)} options={[
                  { value: 'spoilage', label: 'Spoilage' },
                  { value: 'overproduction', label: 'Overproduction' },
                  { value: 'theft', label: 'Theft' },
                  { value: 'expired', label: 'Expired' },
                  { value: 'other', label: 'Other' },
                ]} placeholder="Select reason" />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving || !ingredientId || quantity <= 0}>Record Wastage</Button>
          </CardContent>
        </Card>
      )}

      <DataTable columns={[
        { key: 'created_at', header: 'Date', render: (item) => formatDateTime(item.created_at as string) },
        { key: 'ingredient', header: 'Ingredient', render: (item) => (item.ingredient as { name: string })?.name || '-' },
        { key: 'quantity', header: 'Qty' },
        { key: 'reason', header: 'Reason' },
      ]} data={records as unknown as Record<string, unknown>[]} loading={loading} />
    </div>
  )
}
