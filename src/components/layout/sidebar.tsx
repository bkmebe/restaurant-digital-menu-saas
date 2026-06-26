'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useLanguage } from '@/hooks/use-language'
import { cn } from '@/lib/utils/cn'
import { Role } from '@/types/common'
import {
  LayoutDashboard, UtensilsCrossed, Users, Table2, Wallet,
  ClipboardList, BarChart3, UserCircle, LogOut, Menu, X,
  Receipt, ChefHat, Package, Building2, CreditCard, Tag,
  ChevronRight, Crown, Clock, CalendarDays, FileSpreadsheet,
  DollarSign, Printer, HardDrive, TrendingUp, Award, Shield, Activity,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface NavItem {
  key: string
  href: string
  icon: React.ReactNode
  roles: Role[]
}

const allNavItems: NavItem[] = [
  { key: 'sidebar.dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, roles: ['admin', 'manager', 'cashier', 'waiter', 'kitchen_staff', 'inventory_manager', 'owner', 'system_admin'] },
  { key: 'sidebar.menu', href: '/dashboard/admin/menu', icon: <UtensilsCrossed className="h-4 w-4" />, roles: ['admin', 'system_admin'] },
  { key: 'sidebar.categories', href: '/dashboard/admin/categories', icon: <Tag className="h-4 w-4" />, roles: ['admin', 'system_admin'] },
  { key: 'sidebar.employees', href: '/dashboard/admin/employees', icon: <Users className="h-4 w-4" />, roles: ['admin', 'system_admin'] },
  { key: 'sidebar.tables', href: '/dashboard/admin/tables', icon: <Table2 className="h-4 w-4" />, roles: ['admin', 'system_admin'] },
  { key: 'sidebar.tableAssignment', href: '/dashboard/tables/assign', icon: <UserCircle className="h-4 w-4" />, roles: ['admin', 'manager', 'system_admin'] },
  { key: 'sidebar.payments', href: '/dashboard/admin/payments', icon: <Wallet className="h-4 w-4" />, roles: ['admin', 'system_admin'] },
  { key: 'sidebar.payroll', href: '/dashboard/manager/payroll', icon: <ClipboardList className="h-4 w-4" />, roles: ['admin', 'manager', 'owner', 'system_admin'] },
  { key: 'sidebar.reports', href: '/dashboard/manager/reports', icon: <BarChart3 className="h-4 w-4" />, roles: ['admin', 'manager', 'owner', 'system_admin'] },
  { key: 'sidebar.orgReports', href: '/dashboard/org/reports', icon: <Activity className="h-4 w-4" />, roles: ['admin', 'manager', 'owner', 'system_admin'] },
  { key: 'sidebar.kds', href: '/dashboard/kitchen', icon: <ChefHat className="h-4 w-4" />, roles: ['admin', 'manager', 'kitchen_staff', 'system_admin'] },
  { key: 'sidebar.inventory', href: '/dashboard/inventory', icon: <Package className="h-4 w-4" />, roles: ['admin', 'manager', 'inventory_manager', 'owner', 'system_admin'] },
  { key: 'sidebar.crossBranchInventory', href: '/dashboard/inventory/cross-branch', icon: <Building2 className="h-4 w-4" />, roles: ['admin', 'manager', 'inventory_manager', 'owner', 'system_admin'] },
  { key: 'sidebar.branches', href: '/dashboard/admin/branches', icon: <Building2 className="h-4 w-4" />, roles: ['admin', 'system_admin'] },
  { key: 'sidebar.subscriptions', href: '/dashboard/admin/subscriptions', icon: <CreditCard className="h-4 w-4" />, roles: ['admin', 'owner', 'system_admin'] },
  { key: 'sidebar.waiter', href: '/dashboard/waiter', icon: <UserCircle className="h-4 w-4" />, roles: ['waiter'] },
  { key: 'sidebar.cashier', href: '/dashboard/cashier', icon: <Receipt className="h-4 w-4" />, roles: ['cashier'] },
  { key: 'sidebar.auditLogs', href: '/dashboard/admin/audit-logs', icon: <ClipboardList className="h-4 w-4" />, roles: ['admin', 'owner', 'system_admin'] },
  { key: 'sidebar.owner', href: '/dashboard/owner', icon: <Crown className="h-4 w-4" />, roles: ['owner'] },
  { key: 'sidebar.attendance', href: '/dashboard/attendance', icon: <Clock className="h-4 w-4" />, roles: ['admin', 'manager', 'owner', 'system_admin'] },
  { key: 'sidebar.shifts', href: '/dashboard/shifts', icon: <CalendarDays className="h-4 w-4" />, roles: ['admin', 'manager', 'system_admin'] },
  { key: 'sidebar.eod', href: '/dashboard/eod', icon: <FileSpreadsheet className="h-4 w-4" />, roles: ['admin', 'cashier', 'waiter', 'inventory_manager', 'manager', 'system_admin'] },
  { key: 'sidebar.tips', href: '/dashboard/tips', icon: <DollarSign className="h-4 w-4" />, roles: ['admin', 'manager', 'waiter', 'system_admin'] },
  { key: 'sidebar.receipts', href: '/dashboard/receipts', icon: <Printer className="h-4 w-4" />, roles: ['admin', 'manager', 'cashier', 'system_admin'] },
  { key: 'sidebar.forecasts', href: '/dashboard/forecasts', icon: <TrendingUp className="h-4 w-4" />, roles: ['admin', 'inventory_manager', 'system_admin'] },
  { key: 'sidebar.reservations', href: '/dashboard/reservations', icon: <CalendarDays className="h-4 w-4" />, roles: ['admin', 'manager', 'cashier', 'waiter', 'system_admin'] },
  { key: 'sidebar.customers', href: '/dashboard/customers', icon: <Users className="h-4 w-4" />, roles: ['admin', 'manager', 'system_admin'] },
  { key: 'sidebar.loyalty', href: '/dashboard/loyalty', icon: <Award className="h-4 w-4" />, roles: ['admin', 'manager', 'system_admin'] },
  { key: 'sidebar.backups', href: '/dashboard/backups', icon: <HardDrive className="h-4 w-4" />, roles: ['admin', 'system_admin'] },
  { key: 'sidebar.fayda', href: '/dashboard/fayda', icon: <Shield className="h-4 w-4" />, roles: ['admin', 'manager', 'system_admin'] },
  { key: 'sidebar.paymentVerification', href: '/dashboard/payments/verify', icon: <Shield className="h-4 w-4" />, roles: ['admin', 'manager', 'cashier', 'system_admin'] },
]

interface SidebarProps { role: Role }

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)
  const { t } = useLanguage()

  const items = allNavItems.filter((item) => item.roles.includes(role))

  return (
    <>
      {/* Mobile hamburger button */}
      <Button
        variant="ghost"
        size="icon-sm"
        className="fixed left-4 top-4 z-50 rounded-xl border border-border/60 bg-background/90 shadow-sm backdrop-blur-md lg:hidden"
        onClick={() => setOpen(true)}
        aria-label={t('sidebar.openMenu')}
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar panel */}
      <aside
        data-testid="sidebar"
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border/60 bg-background/80 backdrop-blur-2xl',
          'transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        )}
      >
        {/* Header / Brand */}
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-4">
          <Link href="/dashboard" className="group flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 text-sm font-bold text-primary ring-1 ring-primary/20">
              R
            </span>
            <div className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">{t('sidebar.brand')}</span>
              <span className="block text-[11px] text-muted-foreground/70 font-medium">{t('sidebar.subtitle')}</span>
            </div>
          </Link>
          <Button variant="ghost" size="icon-sm" className="rounded-lg lg:hidden" onClick={() => setOpen(false)} aria-label={t('sidebar.closeMenu')}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 scrollbar-thin">
          <div className="space-y-1">
            {items.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-full bg-primary" />
                  )}
                  <span className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors',
                    isActive
                      ? 'bg-primary/15 text-primary'
                      : 'bg-transparent text-muted-foreground group-hover:text-foreground'
                  )}>
                    {item.icon}
                  </span>
                  <span className="truncate">{t(item.key)}</span>
                  {isActive && (
                    <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-primary/60" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>

        {/* Logout */}
        <div className="border-t border-border/50 p-3">
          <button
            data-testid="logout-button"
            onClick={async () => { await logout(); router.push('/login') }}
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
          >
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-transparent text-muted-foreground/70 group-hover:text-foreground">
              <LogOut className="h-4 w-4" />
            </span>
            <span>{t('sidebar.logout')}</span>
          </button>
        </div>
      </aside>

      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
