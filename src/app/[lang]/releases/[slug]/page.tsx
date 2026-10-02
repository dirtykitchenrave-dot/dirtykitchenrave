import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Artwork from '@/components/Artwork'
import ReleaseCard from '@/components/ReleaseCard'
import TrackList, { type TrackRow } from '@/components/TrackList'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import {
  artistNames,
  artistsByIds,
  findRelease,
  getCatalog,
  releasesByArtist,
  tracksFor,
} from '@/lib/catalog'
import { spotifyHref, tidalHref } from '@/lib/audio-url'
import { artworkAt, catalogNumber, formatDate, isUpcoming, joinNames, slugify } from '@/lib/format'
import { SITE } from '@/lib/site'
import { breadcrumbJsonLd, pageMeta, toCard, toTrackRow, trackListLabels } from '@/lib/view'

export const revalidate = 3600

type Props = { params: Promise<{ lang: string; slug: string }> }

export async function generateStaticParams() {
  const c = await getCatalog()
  return c.releases.map((r) => ({ slug: r.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  if (!isLang(lang)) return {}
  const c = await getCatalog()
  const r = findRelease(c, slug)
  if (!r) return {}
  const d = getDictionary(lang)
  const by = joinNames(artistNames(c, r), lang)
  const title = `${r.title} – ${by}${r.catalog ? ` [${r.catalog}]` : ''}`
  const kind = d.releases.types[r.type]
  const when = formatDate(r.releaseDate, lang, 'long')
  const genre = r.genres[0]
  const description =
    lang === 'es'
      ? `${r.title} de ${by}. ${kind}${r.catalog ? ` ${r.catalog}` : ''} en Dirty Kitchen Rave${genre ? `, ${genre}` : ''}. Sale el ${when}. Preview y compra.`
      : `${r.title} by ${by}. ${kind}${r.catalog ? ` ${r.catalog}` : ''} on Dirty Kitchen Rave${genre ? `, ${genre}` : ''}. Out ${when}. Preview and buy links.`
  const image = artworkAt(r.artwork, 1000)
  return pageMeta(lang, `/releases/${r.slug}`, title, description, {
    type: 'music.album',
    images: image ? [{ url: image, width: 1000, height: 1000, alt: `${r.title} – ${by}` }] : undefined,
  })
}

export default async function ReleasePage({ params }: Props) {
  const { lang, slug } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)
  const c = await getCatalog()
  const r = findRelease(c, slug)
  if (!r) notFound()

  const artists = artistsByIds(c, r.artistIds)
  const remixers = artistsByIds(c, r.remixerIds)
  const tracks = tracksFor(c, r.id)
  const upcoming = isUpcoming(r)
  const nameOf = (ids: number[]) => joinNames(artistsByIds(c, ids).map((a) => a.name), lang)

  const rows: TrackRow[] = tracks.map((t) => toTrackRow(c, t, r, lang))

  const more = artists[0]
    ? releasesByArtist(c, artists[0].id)
        .filter((x) => x.id !== r.id)
        .slice(0, 4)
    : []

  const byArtist = artists.map((a) => a.name)
  const onlyTrack = tracks.length === 1 ? tracks[0] : undefined
  const tidal = tidalHref(r.links.tidal || onlyTrack?.tidalUrl, r.title, byArtist)
  const spotify = spotifyHref(r.links.spotify || onlyTrack?.spotifyUrl, r.title, byArtist)
  const buy = [
    { label: d.release.buy, href: r.links.beatport, main: true },
    { label: d.release.buyTidal, href: tidal.href },
    { label: d.release.listenSpotify, href: spotify.href },
    { label: 'Bandcamp', href: r.links.bandcamp },
    { label: 'Apple Music', href: r.links.apple },
  ].filter((b) => b.href)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'MusicAlbum',
        name: r.title,
        url: `${SITE.url}/${lang}/releases/${r.slug}`,
        image: artworkAt(r.artwork, 1000) || undefined,
        datePublished: r.releaseDate,
        genre: r.genres,
        inLanguage: lang,
        catalogNumber: r.catalog || undefined,
        recordLabel: { '@type': 'Organization', name: SITE.name, url: `${SITE.url}/${lang}` },
        byArtist: artists.map((a) => ({ '@type': 'MusicGroup', name: a.name, url: `${SITE.url}/${lang}/artists/${a.slug}` })),
        numTracks: tracks.length || undefined,
        track: tracks.map((t) => ({
          '@type': 'MusicRecording',
          name: t.mix ? `${t.title} (${t.mix})` : t.title,
          isrcCode: t.isrc || undefined,
          url: t.beatportUrl || undefined,
        })),
      },
      breadcrumbJsonLd(lang, [
        { name: SITE.name, path: '' },
        { name: d.releases.title, path: '/releases' },
        { name: r.title, path: `/releases/${r.slug}` },
      ]),
    ],
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="rel-hero">
        <div className="cover">
          <Artwork src={r.artwork} title={r.title} size={1000} eager badge={upcoming ? d.release.preorder : undefined} />
        </div>
        <div className="info">
          <div className="cat">{catalogNumber(r.catalog)}</div>
          <div>
            <h1>{r.title}</h1>
            <p className="by">
              {artists.length
                ? artists.map((a, i) => (
                    <span key={a.id}>
                      {i > 0 && (i === artists.length - 1 ? (lang === 'es' ? ' y ' : ' & ') : ', ')}
                      <Link href={`/${lang}/artists/${a.slug}`}>{a.name}</Link>
                    </span>
                  ))
                : 'Various Artists'}
            </p>
          </div>
          <dl className="spec">
            {r.catalog && (
              <div>
                <dt>{d.release.catalog}</dt>
                <dd>{r.catalog}</dd>
              </div>
            )}
            <div>
              <dt>{d.release.date}</dt>
              <dd>{formatDate(r.releaseDate, lang)}</dd>
            </div>
            {r.genres[0] && (
              <div>
                <dt>{d.release.genre}</dt>
                <dd>
                  <Link href={`/${lang}/genres/${slugify(r.genres[0])}`}>{r.genres[0]}</Link>
                </dd>
              </div>
            )}
            <div>
              <dt>{d.release.format}</dt>
              <dd>{d.releases.types[r.type]}</dd>
            </div>
            {tracks.length > 0 && (
              <div>
                <dt>{d.release.tracks}</dt>
                <dd>{tracks.length}</dd>
              </div>
            )}
          </dl>
          {r.note && <p className="note">{r.note[lang]}</p>}
          {remixers.length > 0 && (
            <p>
              <strong>{d.release.remixers}: </strong>
              {remixers.map((a, i) => (
                <span key={a.id}>
                  {i > 0 && ', '}
                  <Link href={`/${lang}/artists/${a.slug}`}>{a.name}</Link>
                </span>
              ))}
            </p>
          )}
          <div className="btns">
            {buy.map((b) => (
              <a
                key={b.label}
                className={`btn${b.main ? '' : ' ghost'}`}
                href={b.href!}
                target="_blank"
                rel="noopener noreferrer"
              >
                {b.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="pad" id="tracklist">
        <h2 className="big">{d.release.tracklist}</h2>
        {rows.length ? (
          <TrackList
            tracks={rows}
            queueKey={`release:${r.id}`}
            sharePath={`/${lang}/releases/${r.slug}`}
            lang={lang}
            labels={trackListLabels(d, rows.length)}
          />
        ) : (
          <p className="lead">{d.release.noTracks}</p>
        )}
      </section>

      {more.length > 0 && artists[0] && (
        <section>
          <div className="pad-top section-head">
            <h2 className="big">
              {d.release.moreFrom}{' '}
              <Link href={`/${lang}/artists/${artists[0].slug}`}>{artists[0].name}</Link>
            </h2>
          </div>
          <div className="drops">
            {more.map((x) => (
              <ReleaseCard
                key={x.id}
                r={toCard(c, x, lang)}
                href={`/${lang}/releases/${x.slug}`}
                upcomingLabel={d.releases.upcoming}
                playLabel={d.release.play}
              />
            ))}
          </div>
        </section>
      )}
    </>
  )
}
