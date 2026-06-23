'use client'

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react'
import { getDictionary, getEnglishDictionary, LanguageCode } from '@/lib/i18n/config'

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

const STORAGE_KEY = 'restaurantos-locale'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<LanguageCode>('en')
  const dictionary = getDictionary(locale)
  const englishDict = getEnglishDictionary()

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'am' || stored === 'om' || stored === 'en') {
      setLocaleState(stored)
    }
  }, [])

  const setLocale = useCallback((l: LanguageCode) => {
    setLocaleState(l)
    localStorage.setItem(STORAGE_KEY, l)
  }, [])

  const t = useCallback((key: string, params?: Record<string, string | number>) => {
    let value = dictionary[key] || englishDict[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        value = value.replace(`{${k}}`, String(v))
      }
    }
    return value
  }, [dictionary, englishDict])

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
