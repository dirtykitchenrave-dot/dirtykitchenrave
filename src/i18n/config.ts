export const locales = ['en', 'es'] as const
export type Lang = (typeof locales)[number]
export const defaultLocale: Lang = 'en'

export function isLang(v: string): v is Lang {
  return (locales as readonly string[]).includes(v)
}

/** Swap the language prefix of a pathname: /en/releases -> /es/releases */
export function switchLangPath(pathname: string, to: Lang): string {
  const parts = pathname.split('/')
  if (parts.length > 1 && isLang(parts[1])) {
    parts[1] = to
    return parts.join('/') || `/${to}`
  }
  return `/${to}${pathname === '/' ? '' : pathname}`
}
