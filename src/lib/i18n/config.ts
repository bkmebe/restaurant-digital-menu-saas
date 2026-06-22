import en from './en'
import am from './am'
import om from './om'

export type LanguageCode = 'en' | 'am' | 'om'
export type TranslationKey = keyof typeof en

const dictionaries: Record<LanguageCode, Record<string, string>> = {
  en,
  am,
  om,
}

export function getDictionary(locale: LanguageCode): Record<string, string> {
  return dictionaries[locale] || dictionaries.en
}

export function t(key: string, locale: LanguageCode = 'en'): string {
  const dict = getDictionary(locale)
  return dict[key] || dictionaries.en[key] || key
}
