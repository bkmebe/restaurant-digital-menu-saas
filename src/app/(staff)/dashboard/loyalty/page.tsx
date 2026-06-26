'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useCoupons, useCreateCoupon, useUpdateCoupon, useDeleteCoupon } from '@/hooks/use-crm'
import { useCampaigns, useCreateCampaign } from '@/hooks/use-crm'
import { CouponCard } from '@/components/crm/coupon-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Loader2, Plus, Search, Gift, Megaphone, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'

export default function LoyaltyPage() {
  const { t } = useLanguage()

  const { data: coupons, total: couponTotal, loading: couponsLoading, refetch: refetchCoupons } = useCoupons({})
  const { createCoupon, loading: creatingCoupon } = useCreateCoupon()
  const { updateCoupon } = useUpdateCoupon()
  const { deleteCoupon, loading: deletingCoupon } = useDeleteCoupon()

  const { data: campaigns, total: campaignTotal, loading: campaignsLoading, refetch: refetchCampaigns } = useCampaigns({})
  const { createCampaign, loading: creatingCampaign } = useCreateCampaign()

  const [showCouponForm, setShowCouponForm] = useState(false)
  const [showCampaignForm, setShowCampaignForm] = useState(false)
  const [couponPage, setCouponPage] = useState(1)
  const [campaignPage, setCampaignPage] = useState(1)

  const [couponCode, setCouponCode] = useState('')
  const [couponType, setCouponType] = useState<'percentage' | 'fixed_amount'>('percentage')
  const [couponValue, setCouponValue] = useState(0)
  const [couponMinOrder, setCouponMinOrder] = useState(0)
  const [couponMaxDiscount, setCouponMaxDiscount] = useState<number | undefined>(undefined)
  const [couponUsageLimit, setCouponUsageLimit] = useState<number | undefined>(undefined)
  const [couponExpires, setCouponExpires] = useState('')

  const [campaignName, setCampaignName] = useState('')
  const [campaignType, setCampaignType] = useState('promotion')
  const [campaignChannel, setCampaignChannel] = useState('sms')
  const [campaignContent, setCampaignContent] = useState('')
  const [campaignScheduled, setCampaignScheduled] = useState('')

  const couponTotalPages = Math.ceil(couponTotal / 20)
  const campaignTotalPages = Math.ceil(campaignTotal / 20)

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!couponCode.trim() || !couponValue) return
    const result = await createCoupon({
      code: couponCode.trim(),
      type: couponType as any,
      value: couponValue,
      min_order_amount: couponMinOrder,
      max_discount: couponMaxDiscount || null,
      usage_limit: couponUsageLimit || null,
      expires_at: couponExpires || null,
    } as any)
    if (result) {
      setCouponCode(''); setCouponValue(0); setCouponMinOrder(0); setCouponMaxDiscount(undefined); setCouponUsageLimit(undefined); setCouponExpires('')
      setShowCouponForm(false)
      refetchCoupons()
    }
  }

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!campaignName.trim() || !campaignContent.trim()) return
    const result = await createCampaign({
      name: campaignName.trim(),
      type: campaignType as any,
      channel: campaignChannel as any,
      content: campaignContent,
      scheduled_at: campaignScheduled || null,
    } as any)
    if (result) {
      setCampaignName(''); setCampaignContent(''); setCampaignScheduled('')
      setShowCampaignForm(false)
      refetchCampaigns()
    }
  }

  const handleToggleCoupon = async (id: string, isActive: boolean) => {
    await updateCoupon(id, { is_active: isActive } as any)
    refetchCoupons()
  }

  const handleDeleteCoupon = async (id: string) => {
    await deleteCoupon(id)
    refetchCoupons()
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('crm.loyaltyTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('crm.loyaltyDescription')}</p>
        </div>
      </div>

      <Tabs defaultValue="coupons" className="space-y-4">
        <TabsList>
          <TabsTrigger value="coupons"><Gift className="mr-2 h-4 w-4" />{t('crm.coupons')}</TabsTrigger>
          <TabsTrigger value="campaigns"><Megaphone className="mr-2 h-4 w-4" />{t('crm.campaigns')}</TabsTrigger>
        </TabsList>

        <TabsContent value="coupons" className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder={t('crm.searchCoupons')} className="pl-9" />
            </div>
            <Button onClick={() => setShowCouponForm(!showCouponForm)}>
              <Plus className="mr-2 h-4 w-4" /> {t('crm.newCoupon')}
            </Button>
          </div>

          {showCouponForm && (
            <Card className="border-border/60 bg-card/70 shadow-sm">
              <CardHeader><CardTitle className="text-base">{t('crm.newCoupon')}</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCoupon} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1">
                      <Label>{t('crm.code')} *</Label>
                      <Input value={couponCode} onChange={e => setCouponCode(e.target.value)} placeholder="SUMMER20" required />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('crm.type')}</Label>
                      <select value={couponType} onChange={e => setCouponType(e.target.value as any)} className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-3 py-1 text-sm shadow-sm">
                        <option value="percentage">%</option>
                        <option value="fixed_amount">$</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t('crm.value')} *</Label>
                      <Input type="number" min={0} step="0.01" value={couponValue} onChange={e => setCouponValue(parseFloat(e.target.value) || 0)} required />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('crm.minOrder')}</Label>
                      <Input type="number" min={0} step="0.01" value={couponMinOrder} onChange={e => setCouponMinOrder(parseFloat(e.target.value) || 0)} />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('crm.maxDiscount')}</Label>
                      <Input type="number" min={0} step="0.01" value={couponMaxDiscount || ''} onChange={e => setCouponMaxDiscount(e.target.value ? parseFloat(e.target.value) : undefined)} />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('crm.usageLimit')}</Label>
                      <Input type="number" min={1} value={couponUsageLimit || ''} onChange={e => setCouponUsageLimit(e.target.value ? parseInt(e.target.value) : undefined)} />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('crm.expiresAt')}</Label>
                      <Input type="date" value={couponExpires} onChange={e => setCouponExpires(e.target.value)} />
                    </div>
                  </div>
                  <Button type="submit" disabled={creatingCoupon || !couponCode.trim()}>
                    {creatingCoupon ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('crm.createCoupon')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {couponsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : coupons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Gift className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t('crm.noCoupons')}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {coupons.map(c => (
                <CouponCard key={c.id} coupon={c} onToggleActive={handleToggleCoupon} onDelete={handleDeleteCoupon} />
              ))}
            </div>
          )}

          {couponTotalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={couponPage <= 1} onClick={() => setCouponPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" /> {t('common.previous')}
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">{t('common.page')} {couponPage} / {couponTotalPages}</span>
              <Button variant="outline" size="sm" disabled={couponPage >= couponTotalPages} onClick={() => setCouponPage(p => p + 1)}>
                {t('common.next')} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setShowCampaignForm(!showCampaignForm)}>
              <Plus className="mr-2 h-4 w-4" /> {t('crm.newCampaign')}
            </Button>
          </div>

          {showCampaignForm && (
            <Card className="border-border/60 bg-card/70 shadow-sm">
              <CardHeader><CardTitle className="text-base">{t('crm.newCampaign')}</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label>{t('crm.campaignName')} *</Label>
                      <Input value={campaignName} onChange={e => setCampaignName(e.target.value)} required />
                    </div>
                    <div className="space-y-1">
                      <Label>{t('crm.campaignType')}</Label>
                      <select value={campaignType} onChange={e => setCampaignType(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-3 py-1 text-sm shadow-sm">
                        <option value="promotion">{t('crm.type.promotion')}</option>
                        <option value="event">{t('crm.type.event')}</option>
                        <option value="newsletter">{t('crm.type.newsletter')}</option>
                        <option value="loyalty_drive">{t('crm.type.loyalty_drive')}</option>
                        <option value="reengagement">{t('crm.type.reengagement')}</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t('crm.channel')}</Label>
                      <select value={campaignChannel} onChange={e => setCampaignChannel(e.target.value)} className="flex h-9 w-full rounded-lg border border-input bg-background/50 px-3 py-1 text-sm shadow-sm">
                        <option value="sms">SMS</option>
                        <option value="email">Email</option>
                        <option value="both">Both</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label>{t('crm.scheduledAt')}</Label>
                      <Input type="datetime-local" value={campaignScheduled} onChange={e => setCampaignScheduled(e.target.value)} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>{t('crm.content')} *</Label>
                    <textarea
                      value={campaignContent}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setCampaignContent(e.target.value)}
                      rows={4}
                      required
                      className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>
                  <Button type="submit" disabled={creatingCampaign || !campaignName.trim() || !campaignContent.trim()}>
                    {creatingCampaign ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('crm.createCampaign')}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {campaignsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Megaphone className="mb-4 h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{t('crm.noCampaigns')}</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {campaigns.map(c => (
                <Card key={c.id} className="border-border/60 bg-card/70 shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-semibold">{c.name}</CardTitle>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium">{c.status}</span>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1.5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Megaphone className="h-3.5 w-3.5" />
                        <span>{t(`crm.type.${c.type}` as any)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-3.5 w-3.5" />
                        <span>{c.scheduled_at ? new Date(c.scheduled_at).toLocaleDateString() : t('crm.immediate')}</span>
                      </div>
                      {c.content && <p className="text-xs line-clamp-2 italic">{c.content}</p>}
                      <div className="flex gap-3 text-xs">
                        <span>{t('crm.sent')}: {c.sent_count}</span>
                        <span>{t('crm.opened')}: {c.opened_count}</span>
                        <span>{t('crm.redeemed')}: {c.redeemed_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {campaignTotalPages > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="outline" size="sm" disabled={campaignPage <= 1} onClick={() => setCampaignPage(p => p - 1)}>
                <ChevronLeft className="h-4 w-4" /> {t('common.previous')}
              </Button>
              <span className="flex items-center text-sm text-muted-foreground">{t('common.page')} {campaignPage} / {campaignTotalPages}</span>
              <Button variant="outline" size="sm" disabled={campaignPage >= campaignTotalPages} onClick={() => setCampaignPage(p => p + 1)}>
                {t('common.next')} <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
