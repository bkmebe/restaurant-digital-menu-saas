'use client'

import { Button } from '@/components/ui/button'
import { Store, QrCode, Table2, UtensilsCrossed, Rocket } from 'lucide-react'

interface WelcomeStepProps {
  onNext: () => void
}

const items = [
  { icon: Store, label: 'Restaurant Profile', desc: 'Set up your restaurant details and branding' },
  { icon: Table2, label: 'Tables & QR Codes', desc: 'Configure your tables and generate QR codes for customers' },
  { icon: UtensilsCrossed, label: 'Menu Items', desc: 'Add categories and menu items in 3 languages' },
  { icon: Rocket, label: 'Go Live', desc: 'Launch and start accepting orders' },
]

export function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Store className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Welcome to Restaurant Digital Menu!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your restaurant is created. Let us help you set up in just a few steps.
          This should take about 5 minutes.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <div key={item.label} className="flex items-start gap-3 p-4 rounded-lg border bg-card">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
              </div>
            </div>
          )
        })}
      </div>

      <Button onClick={onNext} size="lg" className="w-full">
        Get Started
      </Button>
    </div>
  )
}
