'use client'

import { Sidebar } from './sidebar'
import { Role } from '@/types/common'

interface DashboardShellProps {
  children: React.ReactNode
  role: Role
}

export function DashboardShell({ children, role }: DashboardShellProps) {
  return (
    <div className="relative min-h-screen bg-background text-foreground md:flex">
      <Sidebar role={role} />
      <div className="relative flex-1 min-w-0 px-4 pb-8 pt-16 sm:px-6 md:pt-6 lg:px-8 xl:px-10">
        <div className="mx-auto w-full max-w-[1320px] animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  )
}
