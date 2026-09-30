import '@fontsource-variable/archivo/wdth.css'
import '../globals.css'
import type { Metadata, Viewport } from 'next'
import { notFound } from 'next/navigation'
import Footer from '@/components/Footer'
import Nav from '@/components/Nav'
import { PlayerProvider } from '@/components/Player'
import { isLang, locales } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { SITE } from '@/lib/site'
import { alternates } from '@/lib/view'

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
    alternates: alternates(lang, ''),
    openGraph: {
      type: 'website',
      siteName: SITE.name,
      locale: lang === 'es' ? 'es_ES' : 'en_GB',
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
        </PlayerProvider>
      </body>
    </html>
  )
}
