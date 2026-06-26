'use client'

import { useState, useRef } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { useCreatePaymentVerification } from '@/hooks/use-payment-verification'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { Upload, X, Shield, CheckCircle, AlertTriangle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  onSuccess?: () => void
}

const PROVIDERS = [
  { value: 'telebirr', label: 'Telebirr' },
  { value: 'cbe_birr', label: 'CBE Birr' },
  { value: 'santimpay', label: 'SantimPay' },
  { value: 'chapa', label: 'Chapa' },
]

const METHODS = [
  { value: 'receipt_upload', label: 'Receipt Upload' },
  { value: 'reference_check', label: 'Reference Check' },
]

export function PaymentVerificationForm({ onSuccess }: Props) {
  const { t } = useLanguage()
  const { create, loading, error, clearError } = useCreatePaymentVerification()
  const [provider, setProvider] = useState('')
  const [method, setMethod] = useState('receipt_upload')
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState('')
  const [orderRef, setOrderRef] = useState('')
  const [receiptUrl, setReceiptUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [success, setSuccess] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const supabase = createClient()
      const fileExt = file.name.split('.').pop()
      const fileName = `receipts/${Date.now()}.${fileExt}`
      const { data, error: uploadError } = await supabase.storage
        .from('payment-qrs')
        .upload(fileName, file)
      if (uploadError) throw uploadError
      const { data: { publicUrl } } = supabase.storage.from('payment-qrs').getPublicUrl(data.path)
      setReceiptUrl(publicUrl)
    } catch {
      // silent
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async () => {
    clearError()
    setSuccess(false)
    if (!provider) return
    const result = await create({
      provider,
      verification_method: method,
      verification_reference: reference || undefined,
      receipt_image_url: receiptUrl || undefined,
      amount: amount ? Number(amount) : undefined,
      order_id: orderRef || undefined,
    })
    if (result) {
      setSuccess(true)
      setProvider('')
      setMethod('receipt_upload')
      setReference('')
      setAmount('')
      setOrderRef('')
      setReceiptUrl('')
      onSuccess?.()
    }
  }

  return (
    <Card className="border-border/60 bg-card/85 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          {t('payment.verification.newVerification')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 p-3 text-sm text-emerald-600">
            <CheckCircle className="h-4 w-4" />
            {t('payment.verification.success')}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('payment.verification.provider')}</Label>
            <Select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              options={[{ value: '', label: t('payment.verification.selectProvider') }, ...PROVIDERS]}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('payment.verification.method')}</Label>
            <Select
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              options={METHODS}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('payment.verification.reference')}</Label>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={t('payment.verification.referencePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('payment.verification.amount')}</Label>
            <Input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-2">
            <Label>{t('payment.verification.orderRef')}</Label>
            <Input
              value={orderRef}
              onChange={(e) => setOrderRef(e.target.value)}
              placeholder={t('payment.verification.orderRefPlaceholder')}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>{t('payment.verification.receiptImage')}</Label>
          <div className="flex items-center gap-4">
            {receiptUrl ? (
              <div className="relative w-32 h-32 rounded-md overflow-hidden border">
                <img src={receiptUrl} alt="Receipt" className="w-full h-full object-cover" />
                <button
                  onClick={() => setReceiptUrl('')}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-0.5"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="w-32 h-32 rounded-md border border-dashed flex items-center justify-center text-muted-foreground">
                <Upload className="h-6 w-6" />
              </div>
            )}
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
                {uploading ? 'Uploading...' : t('payment.verification.uploadReceipt')}
              </Button>
              <input ref={inputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        <Button onClick={handleSubmit} disabled={loading || !provider} className="w-full gap-2">
          {loading ? <LoadingSpinner size="sm" /> : <Shield className="h-4 w-4" />}
          {t('payment.verification.submit')}
        </Button>
      </CardContent>
    </Card>
  )
}
