'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { WelcomeStep } from '@/components/onboarding/welcome-step'
import { PlanStep } from '@/components/onboarding/plan-step'
import { RestaurantStep } from '@/components/onboarding/restaurant-step'
import { TablesStep } from '@/components/onboarding/tables-step'
import { MenuStep } from '@/components/onboarding/menu-step'
import { CompleteStep } from '@/components/onboarding/complete-step'
import { StepIndicator } from '@/components/onboarding/step-indicator'
import type { Plan } from '@/components/onboarding/plan-step'
import { ArrowLeft, ArrowRight } from 'lucide-react'

interface OnboardingData {
  step: number
  completed: boolean
  restaurant: Record<string, unknown> | null
  tableCount: number
  categoryCount: number
  plans: Plan[]
}

export default function OnboardingPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const STEPS = [
    { id: 0, label: t('onboarding.steps.welcome') },
    { id: 1, label: t('onboarding.steps.plan') },
    { id: 2, label: t('onboarding.steps.restaurant') },
    { id: 3, label: t('onboarding.steps.tables') },
    { id: 4, label: t('onboarding.steps.menu') },
    { id: 5, label: t('onboarding.steps.goLive') },
  ]
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<OnboardingData | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [tables, setTables] = useState<Array<{ tableNumber: number; capacity: number }>>([])
  const [categories, setCategories] = useState<Array<{
    name: string; nameAm: string; nameOm: string; icon: string; items: Array<{ name: string; nameAm: string; nameOm: string; price: number; description: string }>
  }>>([])

  useEffect(() => {
    loadStatus()
  }, [])

  async function loadStatus() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }
    try {
      const res = await fetch('/api/onboarding/status')
      const json = await res.json()
      if (json.data) {
        setData(json.data)
        if (json.data.completed) {
          router.push('/dashboard')
          return
        }
        setCurrentStep(json.data.step || 0)
      }
    } catch {
      // ignore
    }
    setLoading(false)
  }

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [currentStep])

  const handlePlanSelect = (planId: string) => {
    setSelectedPlan(planId)
    handleNext()
  }

  const handleTablesComplete = (newTables: Array<{ tableNumber: number; capacity: number }>) => {
    setTables(newTables)
    handleNext()
  }

  const handleMenuComplete = () => {
    handleNext()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <WelcomeStep onNext={handleNext} />
      case 1:
        return (
          <PlanStep
            plans={data?.plans || []}
            selectedPlan={selectedPlan}
            onSelect={handlePlanSelect}
          />
        )
      case 2:
        return (
          <RestaurantStep
            restaurant={data?.restaurant as Record<string, string> | null}
            onComplete={handleNext}
          />
        )
      case 3:
        return (
          <TablesStep
            initialCount={data?.tableCount || 0}
            onComplete={handleTablesComplete}
          />
        )
      case 4:
        return (
          <MenuStep
            initialCount={data?.categoryCount || 0}
            categories={categories}
            setCategories={setCategories}
            onComplete={handleMenuComplete}
          />
        )
      case 5:
        return (
          <CompleteStep
            restaurantId={data?.restaurant?.id as string || ''}
            planId={selectedPlan}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t('onboarding.setupTitle')}</h1>
        <p className="text-muted-foreground">{t('onboarding.setupDesc')}</p>
      </div>

      <StepIndicator steps={STEPS} currentStep={currentStep} />

      <Card>
        <CardContent className="p-6 sm:p-8">
          {renderStep()}
        </CardContent>
      </Card>

      {currentStep > 0 && currentStep < 5 && (
        <div className="flex justify-between">
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-2" /> {t('onboarding.back')}
          </Button>
          {currentStep === 2 && (
            <Button onClick={handleNext}>
              {t('onboarding.skip')} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
          {currentStep === 4 && categories.length === 0 && (
            <Button onClick={handleNext}>
              {t('onboarding.skip')} <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
