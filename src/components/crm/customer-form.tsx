'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, X } from 'lucide-react'

interface CustomerFormProps {
  onSubmit: (data: { name: string; phone?: string; email?: string; notes?: string; tags?: string[] }) => Promise<boolean>
  loading?: boolean
  initialData?: { name: string; phone?: string; email?: string; notes?: string; tags?: string[] }
}

export function CustomerForm({ onSubmit, loading, initialData }: CustomerFormProps) {
  const { t } = useLanguage()
  const [name, setName] = useState(initialData?.name || '')
  const [phone, setPhone] = useState(initialData?.phone || '')
  const [email, setEmail] = useState(initialData?.email || '')
  const [notes, setNotes] = useState(initialData?.notes || '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(initialData?.tags || [])

  const addTag = () => {
    const trimmed = tagInput.trim()
    if (trimmed && !tags.includes(trimmed)) {
      setTags(prev => [...prev, trimmed])
    }
    setTagInput('')
  }

  const removeTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const ok = await onSubmit({
      name: name.trim(),
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      notes: notes.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
    })
    if (ok) {
      setName(''); setPhone(''); setEmail(''); setNotes(''); setTags([])
    }
  }

  return (
    <Card className="border-border/60 bg-card/70 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">{initialData ? t('crm.editCustomer') : t('crm.newCustomer')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">{t('crm.name')} *</Label>
              <Input id="name" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t('crm.phone')}</Label>
              <Input id="phone" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('crm.email')}</Label>
              <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>{t('crm.tags')}</Label>
              <div className="flex gap-1">
                <Input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag() } }} placeholder={t('crm.addTag')} />
                <Button type="button" variant="outline" size="sm" onClick={addTag}>+</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {tags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs">
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-destructive"><X className="h-3 w-3" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t('crm.notes')}</Label>
            <textarea
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <Button type="submit" disabled={loading || !name.trim()} className="w-full">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {initialData ? t('crm.saveChanges') : t('crm.createCustomer')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
