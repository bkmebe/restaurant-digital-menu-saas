'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { CheckCircle, QrCode, ExternalLink, Rocket, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface CompleteStepProps {
  restaurantId: string
  planId: string | null
}

export function CompleteStep({ restaurantId, planId }: CompleteStepProps) {
  const router = useRouter()
  const [tables, setTables] = useState<Array<{ id: string; table_number: number }>>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [menuUrl, setMenuUrl] = useState('')

  useEffect(() => {
    async function load() {
      if (!restaurantId) {
        setLoading(false)
        return
      }
      const supabase = createClient()
      const { data } = await supabase
        .from('tables')
        .select('id, table_number')
        .eq('restaurant_id', restaurantId)
        .order('table_number')

      if (data) setTables(data)
      setLoading(false)
    }
    load()
  }, [restaurantId])

  const handleComplete = async () => {
    setCompleting(true)
    try {
      await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      })
      setCompleted(true)

      const origin = window.location.origin
      if (tables.length > 0) {
        setMenuUrl(`${origin}/menu/${tables[0]?.id}`)
      }
    } catch {
      // ignore
    }
    setCompleting(false)
  }

  if (loading) {
    return <div className="flex justify-center py-12"><LoadingSpinner size="lg" /></div>
  }

  if (completed) {
    return (
      <div className="text-center space-y-6 py-6">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <Rocket className="h-10 w-10 text-green-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold">You&apos;re Live! 🎉</h2>
          <p className="text-muted-foreground">
            Your restaurant digital menu is ready. Start accepting orders!
          </p>
        </div>

        {menuUrl && (
          <Card className="p-4 bg-muted/50">
            <p className="text-sm font-medium mb-2">Your Menu URL</p>
            <Link
              href={menuUrl}
              target="_blank"
              className="flex items-center justify-center gap-2 text-sm text-primary hover:underline"
            >
              {menuUrl} <ExternalLink className="h-3 w-3" />
            </Link>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
          {menuUrl && (
            <Button variant="outline" onClick={() => window.open(menuUrl, '_blank')}>
              <ExternalLink className="h-4 w-4 mr-2" /> View Menu
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <Rocket className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold">Ready to Go Live!</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Your restaurant is set up with {tables.length} table{tables.length !== 1 ? 's' : ''}.
          Click below to launch and start serving customers.
        </p>
      </div>

      <div className="bg-muted/30 rounded-lg p-6 space-y-4">
        <h3 className="font-semibold">Setup Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Plan', value: planId ? 'Selected' : 'Free' },
            { label: 'Tables', value: String(tables.length) },
            { label: 'QR Codes', value: 'Auto-generated' },
            { label: 'Status', value: 'Ready' },
          ].map((item) => (
            <div key={item.label} className="text-center p-3 rounded-lg bg-background">
              <p className="text-xs text-muted-foreground">{item.label}</p>
              <p className="font-semibold mt-1">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <Button size="lg" className="w-full" onClick={handleComplete} disabled={completing}>
        {completing ? (
          <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Launching...</>
        ) : (
          <><Rocket className="h-4 w-4 mr-2" /> Launch Your Restaurant</>
        )}
      </Button>
    </div>
  )
}
