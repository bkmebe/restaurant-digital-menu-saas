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
import { Plus } from 'lucide-react'

export default function IngredientsPage() {
  const { t } = useLanguage()
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
    { key: 'name', header: t('inventory.nameEnglish') },
    { key: 'category', header: t('inventory.category') },
    { key: 'unit', header: t('common.unit'), render: (item: Record<string, unknown>) => (item.unit as { symbol: string })?.symbol || '-' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('inventory.ingredients')}</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />{t('inventory.addIngredient')}</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('inventory.nameEnglish')}</Label>
                <Input value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.nameAmharic')}</Label>
                <Input value={nameAm} onChange={e => setNameAm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.nameOromo')}</Label>
                <Input value={nameOm} onChange={e => setNameOm(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{t('inventory.category')}</Label>
                <Select value={category} onChange={e => setCategory(e.target.value)} options={[
                  { value: 'produce', label: t('inventory.produce') },
                  { value: 'meat', label: t('inventory.meat') },
                  { value: 'dairy', label: t('inventory.dairy') },
                  { value: 'dry', label: t('inventory.dryGoods') },
                  { value: 'beverage', label: t('inventory.beverage') },
                  { value: 'other', label: t('inventory.other') },
                ]} placeholder={t('inventory.selectCategory')} />
              </div>
            </div>
            <Button onClick={handleCreate} disabled={saving || !name}>{t('inventory.saveIngredient')}</Button>
          </CardContent>
        </Card>
      )}

      <DataTable columns={columns} data={ingredients as unknown as Record<string, unknown>[]} loading={false} />
    </div>
  )
}
