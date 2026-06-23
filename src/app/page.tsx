'use client'

import Link from 'next/link'
import { APP_NAME, APP_DESCRIPTION } from '@/lib/constants'
import { useLanguage } from '@/hooks/use-language'

export default function HomePage() {
  const { t } = useLanguage()
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-background to-muted p-4">
      <div className="text-center max-w-md">
        <h1 className="text-4xl font-bold tracking-tight">{APP_NAME}</h1>
        <p className="mt-4 text-muted-foreground">{APP_DESCRIPTION}</p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90"
          >
            {t('home.staffLogin')}
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm hover:bg-accent"
          >
            {t('home.createRestaurant')}
          </Link>
          <Link
            href="/menu/sample-table"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium shadow-sm hover:bg-accent"
          >
            {t('home.viewSampleMenu')}
          </Link>
        </div>
      </div>
    </div>
  )
}
