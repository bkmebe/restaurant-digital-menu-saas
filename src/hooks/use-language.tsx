'use client'

import { createContext, useContext, useState, useCallback, ReactNode } from 'react'
import { getDictionary, LanguageCode } from '@/lib/i18n/config'

interface LanguageContextType {
  locale: LanguageCode
  setLocale: (locale: LanguageCode) => void
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
})

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<LanguageCode>('en')
  const dictionary = getDictionary(locale)

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let value = dictionary[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v))
      }
    }
    return value
  }, [dictionary])

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
