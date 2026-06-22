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
      <main className="relative flex-1 min-w-0 px-4 pb-8 pt-20 sm:px-6 md:pt-8 lg:px-10 xl:px-12">
        <div className="mx-auto w-full max-w-[1280px]">
          {children}
        </div>
      </main>
    </div>
  )
}
