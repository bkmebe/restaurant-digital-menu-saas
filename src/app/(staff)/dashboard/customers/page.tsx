'use client'

import { useState, useEffect, useCallback } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useCustomers, useCreateCustomer } from '@/hooks/use-crm'
import { CustomerCard } from '@/components/crm/customer-card'
import { CustomerForm } from '@/components/crm/customer-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Loader2, Plus, Search, Users, ChevronLeft, ChevronRight } from 'lucide-react'

export default function CustomersPage() {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [tierFilter, setTierFilter] = useState('')
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)

  const { data: customers, total, loading, refetch } = useCustomers({ search: searchQuery || undefined, tier: tierFilter || undefined, page })
  const { createCustomer, loading: creating } = useCreateCustomer()

  useEffect(() => { refetch() }, [refetch])

  const handleCreate = useCallback(async (data: Parameters<typeof createCustomer>[0]): Promise<boolean> => {
    const result = await createCustomer(data)
    if (result) { refetch(); setShowForm(false); return true }
    return false
  }, [createCustomer, refetch])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('crm.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('crm.description')}</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" /> {t('crm.newCustomer')}
        </Button>
      </div>

      {showForm && (
        <CustomerForm onSubmit={handleCreate} loading={creating} />
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t('crm.searchCustomers')}
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setPage(1) }}
            className="pl-9"
          />
        </div>
        <select
          value={tierFilter}
          onChange={e => { setTierFilter(e.target.value); setPage(1) }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">{t('crm.allTiers')}</option>
          <option value="bronze">{t('crm.tier.bronze')}</option>
          <option value="silver">{t('crm.tier.silver')}</option>
          <option value="gold">{t('crm.tier.gold')}</option>
          <option value="platinum">{t('crm.tier.platinum')}</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : customers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Users className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{t('crm.noCustomers')}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {customers.map(c => <CustomerCard key={c.id} customer={c} />)}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> {t('common.previous')}
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">{t('common.page')} {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            {t('common.next')} <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  )
}
