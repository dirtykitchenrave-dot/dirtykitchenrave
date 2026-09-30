import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Artwork from '@/components/Artwork'
import ReleaseCard from '@/components/ReleaseCard'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { findArtist, getCatalog, releasesByArtist, remixesByArtist, tracksByArtist } from '@/lib/catalog'
import { LABEL_MANAGER_SLUG, SITE, optimalBreaksArtistUrl } from '@/lib/site'
import TrackList from '@/components/TrackList'
import { artworkAt } from '@/lib/format'
import { pageMeta, toCard, toTrackRow, trackListLabels } from '@/lib/view'

export const revalidate = 3600

type Props = { params: Promise<{ lang: string; slug: string }> }

export async function generateStaticParams() {
  const c = await getCatalog()
  return c.artists.map((a) => ({ slug: a.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  if (!isLang(lang)) return {}
  const c = await getCatalog()
  const a = findArtist(c, slug)
  if (!a) return {}
  const n = releasesByArtist(c, a.id).length
  const description =
    a.bio?.[lang] ||
    (lang === 'es'
      ? `${a.name} en Dirty Kitchen Rave: ${n} ${n === 1 ? 'lanzamiento' : 'lanzamientos'}.`
      : `${a.name} on Dirty Kitchen Rave: ${n} ${n === 1 ? 'release' : 'releases'}.`)
  const image = artworkAt(a.image, 1000)
  return pageMeta(lang, `/artists/${a.slug}`, a.name, description, {
    type: 'profile',
    images: image ? [{ url: image, width: 1000, height: 1000, alt: a.name }] : undefined,
  })
}

export default async function ArtistPage({ params }: Props) {
  const { lang, slug } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)
  const c = await getCatalog()
  const a = findArtist(c, slug)
  if (!a) notFound()

  const releases = releasesByArtist(c, a.id)
  const remixes = remixesByArtist(c, a.id)
  const rows = tracksByArtist(c, a.id).map(({ track, release }, i) => ({
    ...toTrackRow(c, track, release, lang, true),
    position: i + 1,
  }))
  const bioHref = optimalBreaksArtistUrl(a.slug, lang)
  const links = [
    { label: 'Beatport', href: a.links.beatport },
    { label: d.artists.bioLink, href: bioHref },
    { label: 'Bandcamp', href: a.links.bandcamp },
    { label: 'Spotify', href: a.links.spotify },
    { label: 'SoundCloud', href: a.links.soundcloud },
    { label: 'Instagram', href: a.links.instagram },
  ].filter((l) => l.href)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicGroup',
    name: a.name,
    url: `${SITE.url}/${lang}/artists/${a.slug}`,
    image: artworkAt(a.image, 1000) || undefined,
    sameAs: links.map((l) => l.href),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="artist-hero">
        <div className="l">
          <span className="kicker" style={{ fontWeight: 800, textTransform: 'uppercase' }}>
            {a.slug === LABEL_MANAGER_SLUG ? `${d.artists.labelManager}, ` : ''}
            {d.artists.releasesCount(releases.length)}
          </span>
          <h1>{a.name}</h1>
          <p className="lead">{a.bio?.[lang] || (bioHref ? d.artists.bioElsewhere : d.artists.noBio)}</p>
          {links.length > 0 && (
            <div className="tags" aria-label={d.artists.links}>
              {links.map((l) => (
                <a key={l.label} href={l.href!} target="_blank" rel="noopener noreferrer">
                  {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
        <div className="r">
          <Artwork src={a.image} title={a.name} size={800} eager />
        </div>
      </section>

      {rows.length > 0 && (
        <section className="pad" id="listen">
          <h2 className="big">{d.artists.tracksTitle}</h2>
          <TrackList
            tracks={rows}
            queueKey={`artist:${a.id}`}
            sharePath={`/${lang}/artists/${a.slug}`}
            showArtwork
            lang={lang}
            labels={trackListLabels(d, rows.length)}
          />
        </section>
      )}

      {releases.length > 0 && (
        <section>
          <div className="pad-top">
            <h2 className="big">{d.artists.releasesOn}</h2>
          </div>
          <div className="drops">
            {releases.map((r) => (
              <ReleaseCard key={r.id} r={toCard(c, r, lang)} href={`/${lang}/releases/${r.slug}`} upcomingLabel={d.releases.upcoming} playLabel={d.release.play} />
            ))}
          </div>
        </section>
      )}

      {remixes.length > 0 && (
        <section>
          <div className="pad-top">
            <h2 className="big">{d.artists.remixesOn}</h2>
          </div>
          <div className="drops">
            {remixes.map((r) => (
              <ReleaseCard key={r.id} r={toCard(c, r, lang)} href={`/${lang}/releases/${r.slug}`} upcomingLabel={d.releases.upcoming} />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
