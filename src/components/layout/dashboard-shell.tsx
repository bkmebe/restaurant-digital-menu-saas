'use client'

import { Sidebar } from './sidebar'
import { BranchSelector } from './branch-selector'
import { Role } from '@/types/common'

const BRANCH_SELECTOR_ROLES: Role[] = ['admin', 'manager', 'inventory_manager', 'owner', 'system_admin']

interface DashboardShellProps {
  children: React.ReactNode
  role: Role
}

export function DashboardShell({ children, role }: DashboardShellProps) {
  const showBranchSelector = BRANCH_SELECTOR_ROLES.includes(role)

  return (
    <div className="relative min-h-screen bg-background text-foreground md:flex">
      <Sidebar role={role} />
      <div className="relative flex-1 min-w-0 px-4 pb-8 pt-16 sm:px-6 md:pt-6 lg:px-8 xl:px-10">
        {showBranchSelector && (
          <div className="mb-6 flex items-center justify-end">
            <BranchSelector />
          </div>
        )}
        <div className="mx-auto w-full max-w-[1320px] animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  )
}
