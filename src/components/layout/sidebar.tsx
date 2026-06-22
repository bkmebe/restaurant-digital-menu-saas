'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { cn } from '@/lib/utils/cn'
import { Role } from '@/types/common'
import {
  LayoutDashboard,
  UtensilsCrossed,
  Users,
  Table2,
  Wallet,
  ClipboardList,
  BarChart3,
  UserCircle,
  LogOut,
  Menu,
  X,
  Receipt,
  ChefHat,
  Package,
  Building2,
  CreditCard,
  Tag,
} from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  roles: Role[]
}

const allNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, roles: ['admin', 'manager', 'cashier', 'waiter', 'kitchen_staff', 'inventory_manager'] },
  { label: 'Menu', href: '/dashboard/admin/menu', icon: <UtensilsCrossed className="h-4 w-4" />, roles: ['admin'] },
  { label: 'Categories', href: '/dashboard/admin/categories', icon: <Tag className="h-4 w-4" />, roles: ['admin'] },
  { label: 'Employees', href: '/dashboard/admin/employees', icon: <Users className="h-4 w-4" />, roles: ['admin'] },
  { label: 'Tables', href: '/dashboard/admin/tables', icon: <Table2 className="h-4 w-4" />, roles: ['admin'] },
  { label: 'Payments', href: '/dashboard/admin/payments', icon: <Wallet className="h-4 w-4" />, roles: ['admin'] },
  { label: 'Payroll', href: '/dashboard/manager/payroll', icon: <ClipboardList className="h-4 w-4" />, roles: ['admin', 'manager'] },
  { label: 'Reports', href: '/dashboard/manager/reports', icon: <BarChart3 className="h-4 w-4" />, roles: ['admin', 'manager'] },
  { label: 'KDS', href: '/dashboard/kitchen', icon: <ChefHat className="h-4 w-4" />, roles: ['admin', 'manager', 'kitchen_staff'] },
  { label: 'Inventory', href: '/dashboard/inventory', icon: <Package className="h-4 w-4" />, roles: ['admin', 'manager', 'inventory_manager'] },
  { label: 'Branches', href: '/dashboard/admin/branches', icon: <Building2 className="h-4 w-4" />, roles: ['admin'] },
  { label: 'Subscriptions', href: '/dashboard/admin/subscriptions', icon: <CreditCard className="h-4 w-4" />, roles: ['admin'] },
  { label: 'Waiter', href: '/dashboard/waiter', icon: <UserCircle className="h-4 w-4" />, roles: ['waiter'] },
  { label: 'Cashier', href: '/dashboard/cashier', icon: <Receipt className="h-4 w-4" />, roles: ['cashier'] },
  { label: 'Audit Logs', href: '/dashboard/admin/audit-logs', icon: <ClipboardList className="h-4 w-4" />, roles: ['admin'] },
]

interface SidebarProps {
  role: Role
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { logout } = useAuth()
  const [open, setOpen] = useState(false)

  const items = allNavItems.filter((item) => item.roles.includes(role))

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="fixed left-4 top-4 z-50 h-10 w-10 rounded-xl border border-border/70 bg-card/90 shadow-sm backdrop-blur lg:hidden"
        onClick={() => setOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </Button>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-border/70 bg-card/85 backdrop-blur-xl transition-transform duration-300 ease-out lg:translate-x-0 lg:static lg:z-auto',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
          <Link href="/dashboard" className="group flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/12 text-sm font-semibold text-primary">
              R
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-semibold tracking-tight">RestaurantOS</span>
              <span className="block text-xs text-muted-foreground">Hospitality Control</span>
            </span>
          </Link>
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg lg:hidden" onClick={() => setOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-4">
          <nav className="space-y-1.5">
            {items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                    active
                      ? 'bg-primary/12 text-primary ring-1 ring-primary/20'
                      : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                  )}
                >
                  <span
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg transition-colors',
                      active ? 'bg-primary/15 text-primary' : 'bg-muted/70 text-muted-foreground group-hover:text-foreground'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>

        <div className="border-t border-border/70 p-3">
          <button
            onClick={async () => {
              await logout()
              router.push('/login')
            }}
            className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted/70">
              <LogOut className="h-4 w-4" />
            </span>
            Logout
          </button>
        </div>
      </aside>

      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[1px] lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  )
}
