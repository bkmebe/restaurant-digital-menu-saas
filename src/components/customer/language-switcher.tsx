'use client'

import { useLanguage } from '@/hooks/use-language'
import { SUPPORTED_LANGUAGES } from '@/lib/constants'
import { Button } from '@/components/ui/button'
import { Languages } from 'lucide-react'

export function LanguageSwitcher() {
  const { locale, setLocale } = useLanguage()

  return (
    <div className="flex items-center gap-1.5">
      <Languages className="h-4 w-4 text-muted-foreground shrink-0" />
      {SUPPORTED_LANGUAGES.map((lang) => (
        <Button
          key={lang.code}
          variant={locale === lang.code ? 'default' : 'ghost'}
          size="sm"
          className="text-xs h-7 px-2.5 rounded-md font-medium"
          onClick={() => setLocale(lang.code as 'en' | 'am' | 'om')}
        >
          {lang.nativeLabel}
        </Button>
      ))}
    </div>
  )
}
