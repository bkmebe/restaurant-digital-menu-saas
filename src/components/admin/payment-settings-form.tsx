'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentConfigSchema } from '@/lib/utils/validators'
import { PaymentConfigFormData } from '@/types/payment'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { ImageUpload } from '@/components/shared/image-upload'

interface PaymentSettingsFormProps {
  onSubmit: (data: PaymentConfigFormData) => Promise<void>
  defaultValues?: Partial<PaymentConfigFormData>
  loading?: boolean
}

export function PaymentSettingsForm({ onSubmit, defaultValues, loading }: PaymentSettingsFormProps) {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<PaymentConfigFormData>({
    resolver: zodResolver(paymentConfigSchema),
    defaultValues: { provider: 'telebirr', label: '', account_name: '', account_number: '', is_active: true, sort_order: 0, ...defaultValues },
  })

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="provider">Provider</Label>
          <Select
            id="provider"
            {...register('provider')}
            options={[
              { value: 'telebirr', label: 'Telebirr' },
              { value: 'cbe_birr', label: 'CBE Birr' },
              { value: 'bank', label: 'Bank Transfer' },
              { value: 'qr', label: 'QR Payment' },
            ]}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="label">Display Label</Label>
          <Input id="label" {...register('label')} />
          {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="account_name">Account Name</Label>
          <Input id="account_name" {...register('account_name')} />
          {errors.account_name && <p className="text-xs text-destructive">{errors.account_name.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="account_number">Account / Phone Number</Label>
          <Input id="account_number" {...register('account_number')} />
          {errors.account_number && <p className="text-xs text-destructive">{errors.account_number.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="bank_name">Bank Name (for bank transfers)</Label>
          <Input id="bank_name" {...register('bank_name')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="payment_link">Payment Link</Label>
          <Input id="payment_link" {...register('payment_link')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="sort_order">Sort Order</Label>
          <Input id="sort_order" type="number" {...register('sort_order', { valueAsNumber: true })} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>QR Code Image</Label>
        <ImageUpload
          bucket="payment-qrs"
          path="qrs"
          onUpload={(url) => setValue('qr_image_url', url)}
          currentImage={defaultValues?.qr_image_url}
        />
      </div>

      <Button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Payment Method'}
      </Button>
    </form>
  )
}
