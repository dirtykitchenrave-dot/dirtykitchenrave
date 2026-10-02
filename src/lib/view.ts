import type { Metadata } from 'next'
import type { Lang } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import type { ReleaseCardData } from '@/components/ReleaseCard'
import type { TrackListLabels, TrackRow } from '@/components/TrackList'
import type { PlayerTrack } from '@/components/Player'
import { artistNames, artistsByIds, tracksFor } from './catalog'
import { artworkAt, formatDate, isUpcoming, joinNames, slugify } from './format'
import { SITE } from './site'
import type { Catalog, Release, ReleaseType, Track } from './types'

/** Short, distinct names for cards and the genre filter. Beatport strings are too long. */
const CHIP_GENRE: Record<string, string> = {
  'Breaks / Breakbeat / UK Bass': 'Breaks',
  'UK Garage / Bassline': 'UK Garage',
  'Drum & Bass': 'Drum & Bass',
  'Electro (Classic / Detroit / Modern)': 'Electro',
  '140 / Deep Dubstep / Grime': '140 / Grime',
  'Techno (Peak Time / Driving)': 'Peak Techno',
  'Techno (Raw / Deep / Hypnotic)': 'Raw Techno',
  'Hard Dance / Hardcore / Neo Rave': 'Hard Dance',
  'Nu Disco / Disco': 'Nu Disco',
  'Trap / Future Bass': 'Trap',
  'Ambient / Experimental': 'Ambient',
  'Bass House': 'Bass House',
  'Deep House': 'Deep House',
  'Tech House': 'Tech House',
  'Funky House': 'Funky House',
  'Progressive House': 'Prog House',
  'Jackin House': 'Jackin House',
  'Indie Dance': 'Indie Dance',
  'Indie Tech': 'Indie Tech',
  'Dance / Pop': 'Dance / Pop',
  'Psy-Trance': 'Psy-Trance',
  Dubstep: 'Dubstep',
  Electronica: 'Electronica',
  House: 'House',
  Mainstage: 'Mainstage',
  Pop: 'Pop',
}

export function chipGenre(name: string): string {
  if (CHIP_GENRE[name]) return CHIP_GENRE[name]
  const base = name.replace(/\s*\([^)]*\)/g, '').trim()
  return base.split(' / ')[0] || name
}

function trackPeople(c: Catalog, t: Track, r: Release) {
  return artistsByIds(c, t.artistIds.length ? t.artistIds : r.artistIds)
}

/** Artists shown on a release card. Empty when the label is "Various Artists". */
function cardPeople(c: Catalog, r: Release) {
  const direct = artistsByIds(c, r.artistIds)
  if (direct.length) return direct
  const fromTracks = new Set<number>()
  tracksFor(c, r.id).forEach((t) => t.artistIds.forEach((id) => fromTracks.add(id)))
  const people = artistsByIds(c, [...fromTracks])
  if (r.type === 'compilation' || people.length > 3) return []
  return people
}

/** Player item for a track (Beatport preview). Null when the track has no preview. */
export function toPlayerTrack(c: Catalog, t: Track, r: Release, lang: Lang): PlayerTrack | null {
  if (!t.sampleUrl) return null
  const people = trackPeople(c, t, r)
  return {
    id: t.id,
    title: t.title,
    mix: t.mix,
    artists: joinNames(people.map((a) => a.name), lang),
    artistLinks: people.map((a) => ({ name: a.name, href: `/${lang}/artists/${a.slug}` })),
    remixerLinks: artistsByIds(c, t.remixerIds).map((a) => ({ name: a.name, href: `/${lang}/artists/${a.slug}` })),
    artwork: artworkAt(r.artwork, 250),
    sampleUrl: t.sampleUrl,
    beatportUrl: t.beatportUrl,
    spotifyUrl: t.spotifyUrl,
    tidalUrl: t.tidalUrl ?? null,
    artistNames: people.map((a) => a.name),
    href: `/${lang}/releases/${r.slug}#t-${t.id}`,
  }
}

export function toCard(c: Catalog, r: Release, lang: Lang): ReleaseCardData {
  const first = tracksFor(c, r.id).find((t) => t.sampleUrl)
  return {
    slug: r.slug,
    title: r.title,
    catalog: r.catalog,
    artwork: r.artwork,
    artists: joinNames(artistNames(c, r), lang),
    artistLinks: cardPeople(c, r).map((a) => ({ name: a.name, slug: a.slug })),
    genre: chipGenre(r.genres[0] || ''),
    genreHref: r.genres[0] ? `/${lang}/genres/${slugify(r.genres[0])}` : undefined,
    lang,
    date: formatDate(r.releaseDate, lang),
    dateIso: r.releaseDate,
    upcoming: isUpcoming(r),
    preview: first ? toPlayerTrack(c, first, r, lang) : null,
  }
}

export interface ExplorerItem extends ReleaseCardData {
  year: string
  type: ReleaseType
  genreSlugs: string[]
  search: string
}

export function toExplorerItem(c: Catalog, r: Release, lang: Lang): ExplorerItem {
  const card = toCard(c, r, lang)
  return {
    ...card,
    year: r.releaseDate.slice(0, 4),
    type: r.type,
    genreSlugs: r.genres.map(slugify),
    search: [r.title, r.catalog || '', card.artists, ...r.genres].join(' ').toLowerCase(),
  }
}

/** Row for <TrackList>. `withRelease` adds the release title/link (artist pages). */
export function toTrackRow(c: Catalog, t: Track, r: Release, lang: Lang, withRelease = false): TrackRow {
  const people = trackPeople(c, t, r)
  const names = people.map((a) => a.name)
  return {
    id: t.id,
    position: t.position,
    title: t.title,
    mix: t.mix,
    artists: joinNames(names, lang),
    artistNames: names,
    artistLinks: people.map((a) => ({ name: a.name, slug: a.slug })),
    remixerLinks: artistsByIds(c, t.remixerIds).map((a) => ({ name: a.name, slug: a.slug })),
    bpm: t.bpm,
    key: t.key,
    length: t.length,
    sampleUrl: t.sampleUrl,
    beatportUrl: t.beatportUrl,
    spotifyUrl: t.spotifyUrl,
    tidalUrl: t.tidalUrl ?? null,
    artwork: artworkAt(r.artwork, 250),
    releaseTitle: withRelease ? r.title : undefined,
    releaseHref: `/${lang}/releases/${r.slug}`,
  }
}

export function trackListLabels(d: Dictionary, count: number): TrackListLabels {
  return {
    play: d.release.play,
    pause: d.release.pause,
    noPreview: d.release.noPreview,
    bpm: d.release.bpm,
    share: d.release.share,
    copied: d.release.copied,
    tapToPlay: d.release.tapToPlay,
    playAll: d.release.playAll,
    stop: d.release.stop,
    count: d.release.tracksCount(count),
    openSpotify: d.release.openSpotify,
    searchSpotify: d.release.searchSpotify,
    openTidal: d.release.openTidal,
    searchTidal: d.release.searchTidal,
    openBeatport: d.release.openBeatport,
  }
}

/**
 * Page metadata with its own Open Graph. A page-level `openGraph` replaces the layout's one
 * (no deep merge), so siteName, locale and url are set here for every page.
 */
export function pageMeta(
  lang: Lang,
  path: string,
  title: string,
  description: string,
  og: { images?: { url: string; width?: number; height?: number; alt?: string }[]; type?: 'website' | 'music.album' | 'profile' } = {},
): Metadata {
  const ogTitle = `${title} | ${SITE.name}`
  return {
    title,
    description,
    alternates: alternates(lang, path),
    openGraph: {
      type: og.type ?? 'website',
      siteName: SITE.name,
      locale: lang === 'es' ? 'es_ES' : 'en_GB',
      alternateLocale: lang === 'es' ? 'en_GB' : 'es_ES',
      url: `/${lang}${path}`,
      title: ogTitle,
      description,
      images: og.images ?? [{ url: `/${lang}/opengraph-image`, width: 1200, height: 630, alt: SITE.name }],
    },
    twitter: { card: 'summary_large_image', title: ogTitle, description },
  }
}

/** hreflang + canonical for a path that exists in both languages (path starts with "/" or is ""). */
export function alternates(lang: Lang, path: string) {
  return {
    canonical: `/${lang}${path}`,
    languages: {
      en: `/en${path}`,
      es: `/es${path}`,
      'x-default': `/en${path}`,
    },
  }
}
