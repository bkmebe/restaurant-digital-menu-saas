'use client'

import { useLanguage } from '@/hooks/use-language'
import { ServiceRequest } from '@/types/database'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SERVICE_REQUEST_STATUS_COLORS } from '@/lib/constants'
import { formatDateTime } from '@/lib/utils/format'
import { Bell, CheckCheck, Clock } from 'lucide-react'

interface ServiceRequestCardProps {
  request: ServiceRequest
  onAcknowledge?: (id: string) => void
  onResolve?: (id: string) => void
}

export function ServiceRequestCard({ request, onAcknowledge, onResolve }: ServiceRequestCardProps) {
  const { t } = useLanguage()

  const typeIcon = request.type === 'waiter' ? <Bell className="h-4 w-4" /> : <Clock className="h-4 w-4" />

  return (
    <Card data-testid="service-request-card" className={`border-l-4 ${request.status === 'pending' ? 'border-l-red-500' : request.status === 'acknowledged' ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {typeIcon}
              <span className="font-medium capitalize">{request.type}</span>
              <Badge className={SERVICE_REQUEST_STATUS_COLORS[request.status]}>
                {request.status}
              </Badge>
            </div>
            {request.table && (
              <p className="text-sm text-muted-foreground mt-1">
                Table {request.table.table_number}
              </p>
            )}
            {request.notes && (
              <p className="text-sm mt-1">{request.notes}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {formatDateTime(request.created_at)}
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {request.status === 'pending' && onAcknowledge && (
              <Button size="sm" variant="outline" data-testid="acknowledge-request" onClick={() => onAcknowledge(request.id)}>
                <CheckCheck className="h-3 w-3 mr-1" />
                {t('waiter.acknowledge')}
              </Button>
            )}
            {request.status === 'acknowledged' && onResolve && (
              <Button size="sm" variant="outline" onClick={() => onResolve(request.id)}>
                {t('waiter.markResolved')}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
