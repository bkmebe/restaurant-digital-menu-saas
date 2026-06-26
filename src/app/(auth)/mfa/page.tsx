'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLanguage } from '@/hooks/use-language'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function MFAPage() {
  const { t } = useLanguage()
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: 'totp',
        code,
      })
      if (error) throw error
      router.push('/dashboard')
    } catch (err) {
      setError('Invalid code. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{t('auth.mfaCode')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerify} className="space-y-4" data-testid="mfa-form">
            <div className="space-y-2">
              <Label htmlFor="code">{t('auth.mfaCode')}</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                maxLength={6}
                required
                data-testid="mfa-code-input"
              />
            </div>
            {error && <p className="text-sm text-destructive" data-testid="mfa-error">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading} data-testid="mfa-verify-button">
              {t('auth.mfaVerify')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
