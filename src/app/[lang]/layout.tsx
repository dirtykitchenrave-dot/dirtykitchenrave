import '@fontsource-variable/archivo/wdth.css'
import '../globals.css'
import { GoogleAnalytics } from '@next/third-parties/google'
import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import CookieBanner from '@/components/CookieBanner'
import Footer from '@/components/Footer'
import Nav from '@/components/Nav'
import { PlayerProvider } from '@/components/Player'
import { isLang, locales } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { SITE } from '@/lib/site'
import { alternates } from '@/lib/view'

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

/**
 * Consent Mode v2 in the first HTML, before GoogleAnalytics.
 * Reads `dkr_cookie_preferences` (same key as CookieBanner) so a returning
 * visitor is granted before the first hit. Default is denied.
 */
const GA_CONSENT_DEFAULT_SCRIPT = `(function(){window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}window.gtag=gtag;var a='denied',m='denied';try{var p=JSON.parse(localStorage.getItem('dkr_cookie_preferences')||'null');if(p){if(p.analytics===true)a='granted';if(p.marketing===true)m='granted'}}catch(e){}gtag('consent','default',{analytics_storage:a,ad_storage:m,ad_user_data:m,ad_personalization:m,wait_for_update:500});})();`

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export const viewport: Viewport = {
  themeColor: '#c7c5c0',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export async function generateMetadata({ params }: { params: Promise<{ lang: string }> }): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const d = getDictionary(lang)
  return {
    metadataBase: new URL(SITE.url),
    title: { default: d.meta.title, template: '%s | Dirty Kitchen Rave' },
    description: d.meta.description,
    applicationName: SITE.name,
    alternates: alternates(lang, ''),
    robots: SITE.indexable ? { index: true, follow: true } : { index: false, follow: false },
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      locale: lang === 'es' ? 'es_ES' : 'en_GB',
      alternateLocale: lang === 'es' ? 'en_GB' : 'es_ES',
      url: `/${lang}`,
      title: d.meta.title,
      description: d.meta.description,
    },
    twitter: { card: 'summary_large_image' },
  }
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)

  return (
    <html lang={lang}>
      <head>
        <link rel="alternate" type="application/rss+xml" title="Dirty Kitchen Rave releases" href="/feed.xml" />
        {GA_ID ? <script id="ga-consent-default" dangerouslySetInnerHTML={{ __html: GA_CONSENT_DEFAULT_SCRIPT }} /> : null}
      </head>
      <body>
        <a className="skip" href="#main">
          {d.nav.skip}
        </a>
        <PlayerProvider lang={lang} labels={d.player}>
          <Nav
            lang={lang}
            t={{
              releases: d.nav.releases,
              artists: d.nav.artists,
              shop: d.nav.shop,
              demos: d.nav.demos,
              about: d.nav.about,
              listen: d.nav.listen,
              discord: d.nav.discord,
              menu: d.nav.menu,
              close: d.nav.close,
              langLabel: d.nav.langLabel,
            }}
          />
          <main id="main">{children}</main>
          <Footer lang={lang} d={d} />
          <CookieBanner lang={lang} t={d.cookieBanner} />
          {GA_ID && process.env.NODE_ENV === 'production' ? <GoogleAnalytics gaId={GA_ID} /> : null}
        </PlayerProvider>
      </body>
    </html>
  )
}
