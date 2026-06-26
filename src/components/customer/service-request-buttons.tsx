'use client'

import { useState } from 'react'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { useServiceRequests } from '@/hooks/use-service-requests'
import { BellRing, Receipt, CheckCircle } from 'lucide-react'

interface ServiceRequestButtonsProps {
  tableId: string
  restaurantId: string
}

export function ServiceRequestButtons({ tableId, restaurantId }: ServiceRequestButtonsProps) {
  const { t } = useLanguage()
  const { createRequest } = useServiceRequests(restaurantId)
  const [sentType, setSentType] = useState<'waiter' | 'bill' | null>(null)
  const [loading, setLoading] = useState(false)

  const handleRequest = async (type: 'waiter' | 'bill') => {
    setLoading(true)
    try {
      await createRequest({ table_id: tableId, type })
      setSentType(type)
      setTimeout(() => setSentType(null), 3000)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  if (sentType) {
    return (
      <div className="flex items-center justify-center gap-2 p-4 bg-green-50 rounded-lg border border-green-200">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <span className="text-sm text-green-700">
          {sentType === 'waiter' ? t('service.waiterOnWay') : t('service.billComing')}
        </span>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <Button
        data-testid="request-waiter"
        variant="outline"
        className="flex-1 gap-2"
        onClick={() => handleRequest('waiter')}
        disabled={loading}
      >
        <BellRing className="h-4 w-4" />
        {t('service.requestWaiter')}
      </Button>
      <Button
        data-testid="request-bill"
        variant="secondary"
        className="flex-1 gap-2"
        onClick={() => handleRequest('bill')}
        disabled={loading}
      >
        <Receipt className="h-4 w-4" />
        {t('service.requestBill')}
      </Button>
    </div>
  )
}
