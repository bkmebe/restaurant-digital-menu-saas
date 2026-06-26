'use client'

import { useEffect, useState } from 'react'
import { useAttendanceClock } from '@/hooks/use-attendance'
import { useLanguage } from '@/hooks/use-language'
import { Button } from '@/components/ui/button'
import { Clock, ClockArrowUp, Coffee, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

interface ClockButtonProps {
  onClockChange?: () => void
}

export function ClockButton({ onClockChange }: ClockButtonProps) {
  const { t } = useLanguage()
  const { clock, clocking, lastClock, error, clearError } = useAttendanceClock()
  const [currentStatus, setCurrentStatus] = useState<'out' | 'in' | 'break'>('out')

  useEffect(() => {
    if (lastClock?.clock_in && !lastClock?.clock_out) {
      setCurrentStatus('in')
    } else {
      setCurrentStatus('out')
    }
  }, [lastClock])

  const handleClock = async (action: 'clock_in' | 'clock_out' | 'break_start') => {
    clearError()
    await clock(action)
    onClockChange?.()
  }

  const timeStr = lastClock?.clock_in
    ? new Date(lastClock.clock_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : null

  const config: Record<'out' | 'in' | 'break', { label: string; icon: LucideIcon; variant: 'default' | 'secondary' | 'outline' }> = {
    out: { label: t('attendance.clockIn'), icon: ClockArrowUp, variant: 'default' },
    in: { label: t('attendance.clockOut'), icon: Clock, variant: 'secondary' },
    break: { label: t('attendance.breakStart'), icon: Coffee, variant: 'outline' },
  }

  const current = config[currentStatus]

  return (
    <div className="flex flex-col items-center gap-2">
      <Button
        data-testid="attendance-clock-in"
        size="lg"
        variant={current.variant}
        disabled={clocking}
        onClick={() => handleClick(currentStatus, handleClock)}
        className={cn(
          'w-48 gap-2 transition-all',
          currentStatus === 'out' && 'bg-primary text-primary-foreground hover:bg-primary/90',
        )}
      >
        <current.icon className={cn('h-5 w-5', clocking && 'animate-spin')} />
        {clocking ? t('common.processing') : current.label}
      </Button>
      {timeStr && currentStatus === 'in' && (
        <p className="text-xs text-muted-foreground">
          {t('attendance.clockedInAt', { time: timeStr })}
        </p>
      )}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}

function handleClick(status: string, handler: (action: 'clock_in' | 'clock_out' | 'break_start') => void) {
  if (status === 'out') handler('clock_in')
  else if (status === 'in') handler('clock_out')
  else handler('break_start')
}
