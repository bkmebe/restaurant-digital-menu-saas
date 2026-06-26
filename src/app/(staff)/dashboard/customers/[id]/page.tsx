'use client'

import { use, useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useCustomer, useCustomerPoints, useAddPoints, useCustomerVisits } from '@/hooks/use-crm'
import { LoyaltyTierBadge } from '@/components/crm/loyalty-tier-badge'
import { PointsHistory } from '@/components/crm/points-history'
import { VisitHistory } from '@/components/crm/visit-history'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Phone, Mail, Tag, TrendingUp, Award, ArrowLeft, Plus } from 'lucide-react'
import Link from 'next/link'

export default function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { t } = useLanguage()
  const { data: customer, loading } = useCustomer(id)
  const { data: points, balance, loading: pointsLoading } = useCustomerPoints(id)
  const { data: visits, loading: visitsLoading } = useCustomerVisits(id)
  const { addPoints, loading: addingPoints } = useAddPoints()

  const [pointsAmount, setPointsAmount] = useState(0)
  const [pointsDescription, setPointsDescription] = useState('')

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>
  }

  if (!customer) {
    return (
      <div className="text-center py-16">
        <p className="text-muted-foreground">{t('crm.customerNotFound')}</p>
        <Button variant="outline" size="sm" className="mt-4" asChild>
          <Link href="/dashboard/customers">{t('crm.backToCustomers')}</Link>
        </Button>
      </div>
    )
  }

  const handleAddPoints = async () => {
    if (!pointsAmount) return
    const result = await addPoints(customer.id, { points: pointsAmount, source: 'adjustment', description: pointsDescription || undefined })
    if (result) { setPointsAmount(0); setPointsDescription('') }
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/dashboard/customers" className="gap-1">
          <ArrowLeft className="h-4 w-4" /> {t('crm.backToCustomers')}
        </Link>
      </Button>

      <Card className="border-border/60 bg-card/70 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl">{customer.name}</CardTitle>
            <p className="text-sm text-muted-foreground">{t('crm.memberSince')} {new Date(customer.created_at).toLocaleDateString()}</p>
          </div>
          <LoyaltyTierBadge tier={customer.loyalty_tier} />
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{customer.phone || '-'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email || '-'}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span>{customer.total_visits} {t('crm.visits')}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Award className="h-4 w-4 text-muted-foreground" />
              <span>${parseFloat(customer.total_spent.toString()).toFixed(2)}</span>
            </div>
          </div>
          {customer.tags && customer.tags.length > 0 && (
            <div className="mt-3 flex items-center gap-2">
              <Tag className="h-4 w-4 text-muted-foreground" />
              <div className="flex flex-wrap gap-1">
                {customer.tags.map(tag => (
                  <span key={tag} className="rounded-full bg-primary/10 px-2 py-0.5 text-xs">{tag}</span>
                ))}
              </div>
            </div>
          )}
          {customer.notes && <p className="mt-3 text-sm text-muted-foreground italic">{customer.notes}</p>}
        </CardContent>
      </Card>

      <Tabs defaultValue="points" className="space-y-4">
        <TabsList>
          <TabsTrigger value="points">{t('crm.points')}</TabsTrigger>
          <TabsTrigger value="visits">{t('crm.visits')}</TabsTrigger>
        </TabsList>

        <TabsContent value="points" className="space-y-4">
          <Card className="border-border/60 bg-card/70 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{t('crm.addPoints')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2 items-end">
                <div className="space-y-1">
                  <Label>{t('crm.points')}</Label>
                  <Input type="number" value={pointsAmount} onChange={e => setPointsAmount(parseInt(e.target.value) || 0)} className="w-24" />
                </div>
                <div className="space-y-1 flex-1">
                  <Label>{t('crm.pointsReason')}</Label>
                  <Input value={pointsDescription} onChange={e => setPointsDescription(e.target.value)} placeholder={t('crm.pointsReason')} />
                </div>
                <Button onClick={handleAddPoints} disabled={addingPoints || !pointsAmount}>
                  {addingPoints ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Plus className="mr-1 h-4 w-4" />}
                  {t('crm.add')}
                </Button>
              </div>
            </CardContent>
          </Card>
          <PointsHistory transactions={points} balance={balance} loading={pointsLoading} />
        </TabsContent>

        <TabsContent value="visits">
          <VisitHistory visits={visits} loading={visitsLoading} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
