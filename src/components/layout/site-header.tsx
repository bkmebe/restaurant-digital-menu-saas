'use client'

import Link from 'next/link'
import { useTheme } from '@/hooks/use-theme'
import { useLanguage } from '@/hooks/use-language'
import { SUPPORTED_LANGUAGES, APP_NAME } from '@/lib/constants'
import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'

export function SiteHeader() {
  const { theme, toggleTheme } = useTheme()
  const { locale, setLocale, t } = useLanguage()

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto flex h-12 max-w-[1320px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-xs font-bold text-primary">
            R
          </span>
          {APP_NAME}
        </Link>

        <div className="flex items-center gap-3">
          {/* Language switcher */}
          <div className="flex items-center gap-0.5 rounded-lg border border-border/40 p-0.5">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => setLocale(lang.code as 'en' | 'am' | 'om')}
                className={cn(
                  'rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
                  locale === lang.code
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {lang.code === 'en' ? 'EN' : lang.code === 'am' ? 'አማ' : 'OM'}
              </button>
            ))}
          </div>

          {/* Dark mode toggle */}
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={toggleTheme}
            className="rounded-lg"
            aria-label={t(theme === 'dark' ? 'header.lightMode' : 'header.darkMode')}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  )
}
