import * as React from 'react'
import { cn } from '@/lib/utils/cn'

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-lg bg-gradient-to-r from-muted via-muted/80 to-muted bg-[length:200%_100%] animate-skeleton', className)}
      {...props}
    />
  )
}

export { Skeleton }
