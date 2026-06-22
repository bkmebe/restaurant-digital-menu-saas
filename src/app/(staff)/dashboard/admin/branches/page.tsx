'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Building2, Plus, MapPin, Phone } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Branch {
  id: string
  name: string
  address: string | null
  phone: string | null
  email: string | null
  is_active: boolean
  created_at: string
}

export default function BranchesPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const router = useRouter()
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', address: '', phone: '', email: '' })

  useEffect(() => {
    if (!profile?.organization_id) return
    loadBranches()
  }, [profile])

  async function loadBranches() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .order('name')
    if (data) setBranches(data)
    setLoading(false)
  }

  async function handleCreate() {
    if (!formData.name || !profile?.organization_id) return
    const supabase = createClient()
    await supabase.from('branches').insert({
      organization_id: profile.organization_id,
      name: formData.name,
      address: formData.address || null,
      phone: formData.phone || null,
      email: formData.email || null,
    })
    setShowForm(false)
    setFormData({ name: '', address: '', phone: '', email: '' })
    loadBranches()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('branches')}</h1>
          <p className="text-muted-foreground">Manage your restaurant branches</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" /> Add Branch
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Input placeholder="Branch name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
            <Input placeholder="Address" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
            <Input placeholder="Phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
            <Input placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            <div className="flex gap-2">
              <Button onClick={handleCreate}>Create</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {branches.map((branch) => (
          <Card key={branch.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building2 className="h-5 w-5" />
                {branch.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {branch.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {branch.address}</p>}
              {branch.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" /> {branch.phone}</p>}
              <p className="text-xs text-muted-foreground">
                {branch.is_active ? 'Active' : 'Inactive'} · Created {new Date(branch.created_at).toLocaleDateString()}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
