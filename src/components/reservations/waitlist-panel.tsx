'use client'

import { useState, useEffect } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useWaitlist } from '@/hooks/use-reservations'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, UserPlus, Phone, Users as UsersIcon } from 'lucide-react'

const statusColors: Record<string, string> = {
  waiting: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  notified: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  seated: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  cancelled: 'bg-gray-100 text-gray-800 dark:bg-gray-800/30 dark:text-gray-300',
}

export function WaitlistPanel() {
  const { t } = useLanguage()
  const { data: entries, loading, fetch, add, updateStatus } = useWaitlist()

  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [guests, setGuests] = useState(2)
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetch({ status: 'waiting' }) }, [fetch])

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setAdding(true)
    const ok = await add({ customer_name: name.trim(), customer_phone: phone.trim() || undefined, guest_count: guests })
    setAdding(false)
    if (ok) { setName(''); setPhone(''); setGuests(2); setShowForm(false); fetch({ status: 'waiting' }) }
  }

  return (
    <Card className="border-border/60 bg-card/70 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">{t('reservation.waitlist')}</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
          <UserPlus className="mr-1 h-4 w-4" /> {t('reservation.addToWaitlist')}
        </Button>
      </CardHeader>
      <CardContent>
        {showForm && (
          <form onSubmit={handleAdd} className="mb-4 flex flex-wrap gap-2">
            <Input placeholder={t('reservation.customerName')} value={name} onChange={e => setName(e.target.value)} className="w-40" required />
            <Input placeholder={t('reservation.phone')} value={phone} onChange={e => setPhone(e.target.value)} className="w-36" />
            <Input type="number" min={1} value={guests} onChange={e => setGuests(parseInt(e.target.value) || 1)} className="w-20" />
            <Button type="submit" size="sm" disabled={adding}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : t('reservation.add')}
            </Button>
          </form>
        )}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : entries.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{t('reservation.noWaitlist')}</p>
        ) : (
          <div className="space-y-2">
            {entries.map(entry => (
              <div key={entry.id} className="flex items-center justify-between rounded-lg border border-border/50 p-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{entry.customer_name}</span>
                    <Badge className={statusColors[entry.status] || ''}>{t(`reservation.waitlistStatus.${entry.status}`)}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><UsersIcon className="h-3 w-3" />{entry.guest_count}</span>
                    {entry.customer_phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{entry.customer_phone}</span>}
                  </div>
                </div>
                <div className="flex gap-1">
                  {entry.status === 'waiting' && (
                    <Button variant="outline" size="sm" className="text-xs h-7" onClick={async () => { await updateStatus(entry.id, 'notified'); fetch({ status: 'waiting' }) }}>
                      {t('reservation.notify')}
                    </Button>
                  )}
                  {entry.status !== 'cancelled' && entry.status !== 'seated' && (
                    <Button variant="ghost" size="sm" className="text-xs h-7 text-red-500" onClick={async () => { await updateStatus(entry.id, 'cancelled'); fetch({ status: 'waiting' }) }}>
                      {t('reservation.cancel')}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
