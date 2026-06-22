'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { CreditCard, Calendar, CheckCircle, XCircle } from 'lucide-react'

interface Subscription {
  id: string
  plan_id: string
  status: string
  current_period_start: string
  current_period_end: string
  canceled_at: string | null
  plan: { name: string; price: number; interval: string }
}

export default function SubscriptionsPage() {
  const { t } = useLanguage()
  const { profile } = useAuth()
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.organization_id) { setLoading(false); return }
    loadData()
  }, [profile])

  async function loadData() {
    setLoading(true)
    const supabase = createClient()
    const [subRes, planRes] = await Promise.all([
      supabase.from('subscriptions').select('*, plan:subscription_plans(*)').eq('organization_id', profile?.organization_id).order('created_at', { ascending: false }),
      supabase.from('subscription_plans').select('*').order('price'),
    ])
    if (subRes.data) setSubscriptions(subRes.data)
    if (planRes.data) setPlans(planRes.data)
    setLoading(false)
  }

  async function handleSubscribe(planId: string) {
    if (!profile?.organization_id) return
    const supabase = createClient()
    await supabase.from('subscriptions').insert({
      organization_id: profile.organization_id,
      plan_id: planId,
      status: 'active',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    loadData()
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t('subscriptions')}</h1>
        <p className="text-muted-foreground">Manage your subscription plan</p>
      </div>

      {/* Active Subscription */}
      {subscriptions.find((s) => s.status === 'active') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              Active Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const active = subscriptions.find((s) => s.status === 'active')
              if (!active) return null
              return (
                <div className="space-y-2">
                  <p className="text-lg font-semibold">{active.plan.name}</p>
                  <p className="text-sm text-muted-foreground">ETB {active.plan.price} / {active.plan.interval}</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1"><Calendar className="h-4 w-4" /> {new Date(active.current_period_start).toLocaleDateString()}</span>
                    <span>→ {new Date(active.current_period_end).toLocaleDateString()}</span>
                  </div>
                </div>
              )
            })()}
          </CardContent>
        </Card>
      )}

      {/* Available Plans */}
      <h2 className="text-xl font-semibold">Available Plans</h2>
      <div className="grid gap-4 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                {plan.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-3xl font-bold">ETB {plan.price}<span className="text-sm font-normal text-muted-foreground">/{plan.interval}</span></p>
              {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
              <Button className="w-full" onClick={() => handleSubscribe(plan.id)}>Subscribe</Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Subscription History */}
      {subscriptions.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">History</h2>
          <div className="space-y-2">
            {subscriptions.map((sub) => (
              <Card key={sub.id}>
                <CardContent className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{sub.plan.name}</p>
                    <p className="text-sm text-muted-foreground">{new Date(sub.current_period_start).toLocaleDateString()} - {new Date(sub.current_period_end).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${sub.status === 'active' ? 'text-green-500' : 'text-muted-foreground'}`}>{sub.status}</span>
                    {sub.status === 'active' ? <CheckCircle className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
