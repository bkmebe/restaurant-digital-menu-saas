'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { usePurchaseOrders, useSuppliers, useIngredients } from '@/hooks/use-inventory'
import { DataTable, Column } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/shared/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils/format'
import { Plus, Minus } from 'lucide-react'

export default function PurchasesPage() {
  const { profile } = useAuth()
  const { orders, refetch } = usePurchaseOrders(profile?.restaurant_id)
  const { suppliers } = useSuppliers(profile?.restaurant_id)
  const { ingredients } = useIngredients(profile?.restaurant_id)
  const [showForm, setShowForm] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [items, setItems] = useState<{ ingredient_id: string; quantity: number; unit_cost: number }[]>([])
  const [saving, setSaving] = useState(false)

  const addItem = () => setItems([...items, { ingredient_id: '', quantity: 0, unit_cost: 0 }])
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx))
  const updateItem = (idx: number, field: keyof (typeof items)[number], value: string | number) => {
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const handleCreate = async () => {
    setSaving(true)
    const supabase = createClient()
    const orderNumber = `PO-${Date.now().toString(36).toUpperCase()}`
    const total = items.reduce((sum, i) => sum + i.quantity * i.unit_cost, 0)

    const { data: po } = await supabase.from('purchase_orders').insert({
      restaurant_id: profile?.restaurant_id,
      supplier_id: supplierId || null,
      order_number: orderNumber,
      status: 'draft',
      total_amount: total,
    }).select().single()

    if (po) {
      await supabase.from('purchase_order_items').insert(
        items.map(i => ({
          purchase_order_id: po.id,
          ingredient_id: i.ingredient_id,
          quantity_ordered: i.quantity,
          unit_cost: i.unit_cost,
          subtotal: i.quantity * i.unit_cost,
        }))
      )
    }

    setShowForm(false)
    setItems([])
    setSupplierId('')
    setSaving(false)
    await refetch()
  }

  const receiveOrder = async (orderId: string) => {
    const supabase = createClient()
    const { data: po } = await supabase.from('purchase_orders').select('*, items:purchase_order_items(*)').eq('id', orderId).single()
    if (!po) return

    // Mark items as received
    for (const item of po.items as Array<{ id: string; quantity_ordered: number }>) {
      await supabase.from('purchase_order_items').update({ quantity_received: item.quantity_ordered }).eq('id', item.id)
    }
    await supabase.from('purchase_orders').update({ status: 'received', received_date: new Date().toISOString() }).eq('id', orderId)
    await refetch()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Purchase Orders</h1>
        <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-2" />New Order</Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onChange={e => setSupplierId(e.target.value)} options={suppliers.map(s => ({ value: s.id, label: s.name }))} placeholder="Select supplier" />
            </div>
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-end">
                  <div className="flex-1">
                    <Label className="text-xs">Ingredient</Label>
                    <Select value={item.ingredient_id} onChange={e => updateItem(idx, 'ingredient_id', e.target.value)} options={ingredients.map(i => ({ value: i.id, label: i.name }))} placeholder="Select" />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Qty</Label>
                    <Input type="number" value={item.quantity || ''} onChange={e => updateItem(idx, 'quantity', Number(e.target.value))} />
                  </div>
                  <div className="w-24">
                    <Label className="text-xs">Unit Cost</Label>
                    <Input type="number" value={item.unit_cost || ''} onChange={e => updateItem(idx, 'unit_cost', Number(e.target.value))} />
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeItem(idx)}><Minus className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addItem}>+ Add Item</Button>
            </div>
            <Button onClick={handleCreate} disabled={saving || items.length === 0}>Create Purchase Order</Button>
          </CardContent>
        </Card>
      )}

      <DataTable columns={[
        { key: 'order_number', header: 'Order #' },
        { key: 'supplier', header: 'Supplier', render: (item) => (item.supplier as { name: string })?.name || '-' },
        { key: 'status', header: 'Status', render: (item) => <StatusBadge status={item.status as string} mapping={{ draft: 'warning', ordered: 'info', received: 'success', cancelled: 'destructive' }} /> },
        { key: 'total_amount', header: 'Total', render: (item) => formatCurrency(Number(item.total_amount)) },
        { key: 'order_date', header: 'Date', render: (item) => formatDate(item.order_date as string) },
        { key: 'actions', header: '', render: (item) => item.status === 'draft' ? <Button size="sm" variant="outline" onClick={() => receiveOrder(item.id as string)}>Receive</Button> : null },
      ]} data={orders as unknown as Record<string, unknown>[]} loading={false} />
    </div>
  )
}
