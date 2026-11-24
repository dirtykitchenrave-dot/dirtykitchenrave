import { NextResponse, type NextRequest } from 'next/server'
import { defaultLocale, isLang, type Lang } from '@/i18n/config'

/**
 * Next.js 16 "proxy" (formerly middleware).
 * - Every public page lives under /en or /es. Anything else is redirected to the visitor's language
 *   (NEXT_LOCALE cookie first, then Accept-Language, then English).
 * - /administrator stays unprefixed. /en/administrator and /es/administrator redirect there.
 * - Short links for socials: /dkr0237 -> /{lang}/r/dkr0237 -> release page.
 */
function pickLang(req: NextRequest): Lang {
  const cookie = req.cookies.get('NEXT_LOCALE')?.value
  if (cookie && isLang(cookie)) return cookie
  const accept = (req.headers.get('accept-language') || '').toLowerCase()
  const first = accept.split(',')[0]?.trim() || ''
  if (first.startsWith('es')) return 'es'
  return defaultLocale
}

function isAdminPath(pathname: string) {
  return pathname === '/administrator' || pathname.startsWith('/administrator/')
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const langAdmin = pathname.match(/^\/(en|es)\/administrator(\/.*)?$/)
  if (langAdmin) {
    const url = req.nextUrl.clone()
    url.pathname = `/administrator${langAdmin[2] || ''}`
    return NextResponse.redirect(url)
  }
  if (isAdminPath(pathname)) return NextResponse.next()

  const firstSegment = pathname.split('/')[1] || ''
  if (isLang(firstSegment)) return NextResponse.next()

  const lang = pickLang(req)
  const url = req.nextUrl.clone()
  const short = pathname.match(/^\/(dkr[a-z]*\d+)\/?$/i)
  url.pathname = short ? `/${lang}/r/${short[1].toLowerCase()}` : `/${lang}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ['/((?!_next|api|favicon.ico|icon|apple-icon|sitemap.xml|robots.txt|feed.xml|.*\\..*).*)'],
}
