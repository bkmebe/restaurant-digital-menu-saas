'use client'

import { cn } from '@/lib/utils/cn'
import { Check } from 'lucide-react'

interface Step {
  id: number
  label: string
}

interface StepIndicatorProps {
  steps: Step[]
  currentStep: number
}

export function StepIndicator({ steps, currentStep }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center">
      {steps.map((step, i) => (
        <div key={step.id} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                step.id < currentStep && 'bg-primary text-primary-foreground',
                step.id === currentStep && 'bg-primary text-primary-foreground ring-4 ring-primary/20',
                step.id > currentStep && 'bg-muted text-muted-foreground'
              )}
            >
              {step.id < currentStep ? (
                <Check className="h-4 w-4" />
              ) : (
                step.id + 1
              )}
            </div>
            <span
              className={cn(
                'hidden sm:inline text-sm font-medium',
                step.id === currentStep ? 'text-foreground' : 'text-muted-foreground'
              )}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={cn(
                'mx-2 h-px w-8 sm:w-16',
                step.id < currentStep ? 'bg-primary' : 'bg-muted'
              )}
            />
          )}
        </div>
      ))}
    </div>
  )
}
