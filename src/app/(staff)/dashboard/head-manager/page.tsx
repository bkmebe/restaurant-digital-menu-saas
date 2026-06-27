'use client'

import { useLanguage } from '@/hooks/use-language'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Wallet, ClipboardList, FileSpreadsheet, BarChart3, CreditCard, Truck } from 'lucide-react'

export default function HeadManagerDashboard() {
  const { t } = useLanguage()

  const sections = [
    {
      title: t('inventory.management'),
      href: '/dashboard/inventory',
      icon: Package,
      description: 'Manage ingredients, stock levels, and inventory operations',
    },
    {
      title: t('inventory.suppliers'),
      href: '/dashboard/inventory/suppliers',
      icon: Truck,
      description: 'Manage suppliers and purchase orders',
    },
    {
      title: t('sidebar.expenses'),
      href: '/dashboard/expenses',
      icon: Wallet,
      description: 'Track and manage restaurant expenses',
    },
    {
      title: t('sidebar.payroll'),
      href: '/dashboard/manager/payroll',
      icon: ClipboardList,
      description: 'Process payroll and approve employee payments',
    },
    {
      title: t('sidebar.eod'),
      href: '/dashboard/eod',
      icon: FileSpreadsheet,
      description: 'End of day closing and approval',
    },
    {
      title: t('sidebar.reports'),
      href: '/dashboard/manager/reports',
      icon: BarChart3,
      description: 'Generate and view downloadable reports',
    },
    {
      title: t('sidebar.payments'),
      href: '/dashboard/admin/payments',
      icon: CreditCard,
      description: 'Manage payment configurations',
    },
  ]

  return (
    <div className="space-y-8 sm:space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/80 p-6 shadow-sm backdrop-blur-xl sm:p-8">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-medium text-muted-foreground">
              <Package className="h-3.5 w-3.5" />
              Head Manager Console
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Head Manager Dashboard
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Inventory management, financial operations, payroll approval, and end of day processing.
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {sections.map((section) => {
          const Icon = section.icon
          return (
            <a key={section.title} href={section.href}>
              <Card className="h-full overflow-hidden rounded-2xl border-border/60 bg-card/85 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                <CardHeader className="space-y-4 pb-2">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5">
                    <CardTitle className="text-base font-semibold tracking-tight">{section.title}</CardTitle>
                    <p className="text-sm leading-relaxed text-muted-foreground">{section.description}</p>
                  </div>
                </CardHeader>
              </Card>
            </a>
          )
        })}
      </div>
    </div>
  )
}
