'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Loader2, Plus, Trash2, Table2, CheckCircle } from 'lucide-react'

interface TablesStepProps {
  initialCount: number
  onComplete: (tables: Array<{ tableNumber: number; capacity: number }>) => void
}

interface TableEntry {
  tableNumber: number
  capacity: number
}

export function TablesStep({ initialCount, onComplete }: TablesStepProps) {
  const [tables, setTables] = useState<TableEntry[]>(
    initialCount > 0 ? [] : [
      { tableNumber: 1, capacity: 4 },
      { tableNumber: 2, capacity: 4 },
      { tableNumber: 3, capacity: 4 },
      { tableNumber: 4, capacity: 2 },
      { tableNumber: 5, capacity: 6 },
    ]
  )
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const addTable = () => {
    const nextNum = tables.length > 0 ? Math.max(...tables.map(t => t.tableNumber)) + 1 : 1
    setTables(prev => [...prev, { tableNumber: nextNum, capacity: 4 }])
  }

  const removeTable = (index: number) => {
    setTables(prev => prev.filter((_, i) => i !== index))
  }

  const updateTable = (index: number, field: keyof TableEntry, value: number) => {
    setTables(prev => prev.map((t, i) => i === index ? { ...t, [field]: value } : t))
  }

  const handleSubmit = async () => {
    if (tables.length === 0) return
    setSaving(true)
    try {
      await fetch('/api/onboarding/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tables }),
      })
      setSaved(true)
      setTimeout(() => onComplete(tables), 800)
    } catch {
      // ignore
    }
    setSaving(false)
  }

  if (saved) {
    return (
      <div className="text-center space-y-4 py-8">
        <CheckCircle className="h-12 w-12 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold">{tables.length} Tables Created!</h2>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Set Up Your Tables</h2>
        <p className="text-sm text-muted-foreground">
          Add your restaurant tables. Customers will scan QR codes to view the menu.
        </p>
      </div>

      <div className="space-y-3">
        {tables.map((table, i) => (
          <Card key={i} className="p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Table2 className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Table #</Label>
                  <Input
                    type="number"
                    value={table.tableNumber}
                    onChange={(e) => updateTable(i, 'tableNumber', parseInt(e.target.value) || 0)}
                    min={1}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs">Capacity</Label>
                  <Input
                    type="number"
                    value={table.capacity}
                    onChange={(e) => updateTable(i, 'capacity', parseInt(e.target.value) || 1)}
                    min={1}
                    className="h-9"
                  />
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-destructive"
                onClick={() => removeTable(i)}
                disabled={tables.length <= 1}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Button variant="outline" onClick={addTable} className="w-full">
        <Plus className="h-4 w-4 mr-2" /> Add Table
      </Button>

      <Button
        className="w-full"
        onClick={handleSubmit}
        disabled={tables.length === 0 || saving}
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
        Save {tables.length} Tables & Continue
      </Button>
    </div>
  )
}
