import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { artistNames, getCatalog, latestRelease } from '@/lib/catalog'
import { joinNames } from '@/lib/format'
import { LINKS, SITE } from '@/lib/site'
import { alternates } from '@/lib/view'

export const revalidate = 3600

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const d = getDictionary(lang)
  return { title: d.links.title, alternates: alternates(lang, '/links') }
}

/** Replacement for the label's Linktree: the URL to put in the Instagram / TikTok bio. */
export default async function LinksPage({ params }: Props) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)
  const c = await getCatalog()
  const latest = latestRelease(c)

  const ext = [
    { label: 'Beatport', sub: d.channels.beatport, href: LINKS.beatport },
    { label: 'Bandcamp', sub: d.channels.bandcamp, href: LINKS.bandcamp },
    { label: 'Spotify', sub: d.channels.spotify, href: LINKS.spotify },
    { label: 'SoundCloud', sub: d.channels.soundcloud, href: LINKS.soundcloud },
    { label: 'Podcast', sub: d.channels.podcast, href: LINKS.podcast },
    { label: 'Twitch', sub: 'afghan_headspin', href: LINKS.twitch },
    { label: 'Discord', sub: d.channels.discord, href: LINKS.discord },
    { label: d.shop.merch, sub: 'Fourthwall', href: LINKS.merch },
    { label: d.shop.eu, sub: 'Deejayskin', href: LINKS.merchEu },
    { label: d.shop.vinyl, sub: 'Elasticstage', href: LINKS.vinyl },
    { label: d.nav.demos, sub: 'LabelRadar', href: LINKS.demos },
    { label: 'Instagram', sub: '@dirtykitchenrave', href: LINKS.instagram },
    { label: 'TikTok', sub: '@dirtykitchenrave', href: LINKS.tiktok },
    { label: 'YouTube', sub: 'Dirty Kitchen Rave', href: LINKS.youtube },
    { label: 'Facebook', sub: 'dirtykitchenrave', href: LINKS.facebook },
    { label: 'WhatsApp', sub: '+44 7590 630773', href: LINKS.whatsapp },
    { label: 'Email', sub: SITE.contactEmail, href: SITE.contactEmail ? `mailto:${SITE.contactEmail}` : '' },
  ].filter((l) => l.href)

  return (
    <section className="pad" style={{ background: 'var(--naranja)', borderBottom: 0 }}>
      <h1 className="page-title" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        Dirty Kitchen Rave
      </h1>
      <nav className="linkstack" aria-label={d.links.title}>
        {latest && (
          <Link className="hot" href={`/${lang}/releases/${latest.slug}`}>
            <span>
              {latest.title}
              <br />
              <small>
                {d.links.latest}: {joinNames(artistNames(c, latest), lang)}
              </small>
            </span>
            <span aria-hidden="true">→</span>
          </Link>
        )}
        <Link href={`/${lang}/releases`}>
          <span>{d.nav.releases}</span>
          <span aria-hidden="true">→</span>
        </Link>
        {ext.map((l) => (
          <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer">
            <span>
              {l.label}
              <br />
              <small>{l.sub}</small>
            </span>
            <span aria-hidden="true">↗</span>
          </a>
        ))}
      </nav>
    </section>
  )
}
