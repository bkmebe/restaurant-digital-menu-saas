'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
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
  const { t } = useLanguage()
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
        <h1 className="text-2xl font-bold">{t('inventory.wastageTracking')}</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />{t('inventory.recordWastage')}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('inventory.ingredient')}</Label>
                <Select value={ingredientId} onChange={e => setIngredientId(e.target.value)} options={ingredients.map(i => ({ value: i.id, label: i.name }))} placeholder={t('inventory.select')} />
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.quantity')}</Label>
                <Input type="number" value={quantity || ''} onChange={e => setQuantity(Number(e.target.value))} />
              </div>
              <div className="space-y-2 col-span-2">
                <Label>{t('inventory.reason')}</Label>
                <Select value={reason} onChange={e => setReason(e.target.value)} options={[
                  { value: 'spoilage', label: t('inventory.spoilage') },
                  { value: 'overproduction', label: t('inventory.overproduction') },
                  { value: 'theft', label: t('inventory.theft') },
                  { value: 'expired', label: t('inventory.expired') },
                  { value: 'other', label: t('inventory.other') },
                ]} placeholder={t('inventory.selectReason')} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving || !ingredientId || quantity <= 0}>{t('inventory.record')}</Button>
          </CardContent>
        </Card>
      )}

      <DataTable columns={[
        { key: 'created_at', header: t('inventory.date'), render: (item: Record<string, unknown>) => formatDateTime(item.created_at as string) },
        { key: 'ingredient', header: t('inventory.ingredient'), render: (item: Record<string, unknown>) => (item.ingredient as { name: string })?.name || '-' },
        { key: 'quantity', header: t('inventory.qty') },
        { key: 'reason', header: t('inventory.reason') },
      ]} data={records as unknown as Record<string, unknown>[]} loading={loading} />
    </div>
  )
}
