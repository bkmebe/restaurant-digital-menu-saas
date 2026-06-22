'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Check, Loader2 } from 'lucide-react'
import { useState } from 'react'

export interface Plan {
  id: string
  name: string
  description: string | null
  price_monthly: number
  max_branches: number
  max_employees: number
  features: string[]
}

interface PlanStepProps {
  plans: Plan[]
  selectedPlan: string | null
  onSelect: (planId: string) => void
}

export function PlanStep({ plans, selectedPlan, onSelect }: PlanStepProps) {
  const [loading, setLoading] = useState<string | null>(null)

  const handleSelect = async (planId: string) => {
    setLoading(planId)
    // Simulate brief delay for UX
    await new Promise(r => setTimeout(r, 300))
    onSelect(planId)
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold">Choose Your Plan</h2>
        <p className="text-sm text-muted-foreground">
          Pick the plan that fits your restaurant. You can upgrade anytime.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((plan) => {
          const isPopular = plan.name === 'Growth'
          const isSelected = selectedPlan === plan.id

          return (
            <Card
              key={plan.id}
              className={`relative p-6 cursor-pointer transition-all hover:shadow-md ${
                isSelected ? 'ring-2 ring-primary border-primary' : ''
              } ${isPopular ? 'border-primary/50' : ''}`}
              onClick={() => handleSelect(plan.id)}
            >
              {isPopular && (
                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">Popular</Badge>
              )}
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
                </div>
                <div>
                  <span className="text-3xl font-bold">ETB {plan.price_monthly}</span>
                  <span className="text-sm text-muted-foreground">/month</span>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Up to {plan.max_branches} branch{plan.max_branches !== 1 ? 'es' : ''}</p>
                  <p>Up to {plan.max_employees} employees</p>
                </div>
                <ul className="space-y-2">
                  {(plan.features as string[]).map((feature) => (
                    <li key={feature} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 shrink-0" />
                      <span className="capitalize">{feature.replace(/_/g, ' ')}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant={isSelected ? 'default' : 'outline'}
                  disabled={loading === plan.id}
                  onClick={() => handleSelect(plan.id)}
                >
                  {loading === plan.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isSelected ? (
                    'Selected'
                  ) : (
                    'Select Plan'
                  )}
                </Button>
              </div>
            </Card>
          )
        })}
      </div>

      {plans.length === 0 && (
        <p className="text-center text-muted-foreground">Loading plans...</p>
      )}
    </div>
  )
}
