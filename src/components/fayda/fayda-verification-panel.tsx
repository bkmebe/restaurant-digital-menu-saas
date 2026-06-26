'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useFaydaVerify } from '@/hooks/use-fayda'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Shield, CheckCircle, AlertTriangle } from 'lucide-react'

interface FaydaVerificationPanelProps {
  employeeId: string
  employeeName: string
  currentFaydaNumber?: string | null
  isVerified?: boolean
  onVerified?: () => void
}

export function FaydaVerificationPanel({
  employeeId,
  employeeName,
  currentFaydaNumber,
  isVerified,
  onVerified,
}: FaydaVerificationPanelProps) {
  const { t } = useLanguage()
  const { verify, loading, error, clearError } = useFaydaVerify()
  const [faydaNumber, setFaydaNumber] = useState(currentFaydaNumber || '')

  if (isVerified) {
    return (
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="h-5 w-5" />
            {t('fayda.verified')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t('fayda.number')}: {currentFaydaNumber}
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleVerify = async () => {
    clearError()
    if (!faydaNumber.trim()) return
    const result = await verify(employeeId, faydaNumber.trim())
    if (result) {
      onVerified?.()
    }
  }

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Shield className="h-5 w-5" />
          {t('fayda.verifyIdentity')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {t('fayda.verifyDesc', { name: employeeName })}
        </p>

        <div className="space-y-2">
          <Label htmlFor="fayda-number">{t('fayda.number')}</Label>
          <Input
            id="fayda-number"
            value={faydaNumber}
            onChange={(e) => setFaydaNumber(e.target.value)}
            placeholder="Enter Fayda ID number"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <Button onClick={handleVerify} disabled={loading || !faydaNumber.trim()} className="w-full gap-2">
          {loading ? <LoadingSpinner size="sm" /> : <Shield className="h-4 w-4" />}
          {t('fayda.verifyNow')}
        </Button>
      </CardContent>
    </Card>
  )
}
