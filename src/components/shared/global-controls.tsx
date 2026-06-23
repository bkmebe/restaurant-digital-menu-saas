'use client'

import { useTheme } from '@/hooks/use-theme'
import { useLanguage } from '@/hooks/use-language'
import { SUPPORTED_LANGUAGES } from '@/lib/constants'
import { Moon, Sun, Languages } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils/cn'
import { useState } from 'react'

export function GlobalControls() {
  const { theme, toggleTheme } = useTheme()
  const { locale, setLocale } = useLanguage()
  const [langOpen, setLangOpen] = useState(false)

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {/* Language switcher */}
      <div className="relative">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 rounded-full shadow-lg border-border/60 bg-background/90 backdrop-blur-md hover:bg-background"
          onClick={() => setLangOpen(!langOpen)}
          aria-label="Switch language"
        >
          <Languages className="h-4 w-4" />
        </Button>
        {langOpen && (
          <>
            <div className="absolute bottom-12 right-0 mb-1 bg-background/95 backdrop-blur-md border border-border/60 rounded-xl shadow-2xl p-1.5 min-w-[130px] animate-scale-in origin-bottom-right">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => { setLocale(lang.code as 'en' | 'am' | 'om'); setLangOpen(false) }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    locale === lang.code
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <span className="text-base">{lang.nativeLabel}</span>
                </button>
              ))}
            </div>
            <div className="fixed inset-0 z-[-1]" onClick={() => setLangOpen(false)} />
          </>
        )}
      </div>

      {/* Dark mode toggle */}
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-full shadow-lg border-border/60 bg-background/90 backdrop-blur-md hover:bg-background"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>
    </div>
  )
}
