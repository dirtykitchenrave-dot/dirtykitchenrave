import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getAdminUser } from './admin-auth'
import { readBookingsFile, readCatalogFile } from './catalog-store'
import type { Artist, Catalog, Release, Track } from './types'

export const PAGE_SIZE = 40

export const BOOKING_STATUS = [
  { value: 'new', label: 'New' },
  { value: 'reviewing', label: 'In review' },
  { value: 'offered', label: 'Offered' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'declined', label: 'Declined' },
] as const

export type BookingStatus = (typeof BOOKING_STATUS)[number]['value']

const STATUS_SET = new Set<string>(BOOKING_STATUS.map((s) => s.value))

export function bookingStatus(raw: string | undefined): BookingStatus | '' {
  return raw && STATUS_SET.has(raw) ? (raw as BookingStatus) : ''
}

export function statusLabel(value: string) {
  return BOOKING_STATUS.find((s) => s.value === value)?.label || value
}

export function pageFrom(raw: string | undefined) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n < 1) return 1
  return Math.min(500, Math.floor(n))
}

/** Strips characters that would break a PostgREST `or` filter. */
export function term(raw: string | undefined) {
  return (raw || '')
    .trim()
    .replace(/[%_\\,().*]/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, 80)
}

export function formatDay(iso: string) {
  const d = new Date(iso.length <= 10 ? `${iso}T12:00:00Z` : iso)
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/London',
  }).format(d)
}

export function formatStamp(iso: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  }).format(new Date(iso))
}

async function gate() {
  if (!(await getAdminUser())) redirect('/administrator/login')
}

const catalogFile = cache(async () => {
  await gate()
  return readCatalogFile()
})

const bookingFile = cache(async () => {
  await gate()
  return readBookingsFile<BookingRow>()
})

/** The JSON catalogue always has TIDAL fields. */
export const tidalColumn = cache(async () => true)

function loc(value: { en: string; es: string } | null | undefined) {
  return { en: value?.en || null, es: value?.es || null }
}

function matches(hay: string, q: string) {
  return hay.toLowerCase().includes(q.toLowerCase())
}

export type BookingRow = {
  id: number
  created_at: string
  lang: string
  contact_name: string
  contact_email: string
  contact_phone: string
  organisation: string
  event_name: string
  event_date: string
  city: string
  country: string
  venue: string
  set_minutes: number
  fee_offer: string
  message: string
  status: BookingStatus
  assigned_artist: string | null
  admin_note: string | null
}

export async function adminDashboard() {
  const catalog = await catalogFile()
  const bookings = [...(await bookingFile())].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  const featured = catalog.releases.find((r) => r.featured) || null
  return {
    artists: catalog.artists.length,
    releases: catalog.releases.length,
    tracks: catalog.tracks.length,
    bookings: bookings.length,
    bookingsNew: bookings.filter((b) => b.status === 'new').length,
    roster: catalog.artists.filter((a) => a.roster).length,
    featured: featured
      ? { title: featured.title, catalog: featured.catalog || '', slug: featured.slug }
      : null,
    latest: bookings.slice(0, 5),
  }
}

export async function listBookings(status: BookingStatus | '') {
  const rows = [...(await bookingFile())].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
  return (status ? rows.filter((row) => row.status === status) : rows).slice(0, 200)
}

export type ArtistListRow = {
  id: number
  name: string
  slug: string
  country: string | null
  is_roster: boolean
  bio_en: string | null
  bio_es: string | null
}

function artistRow(a: Artist): ArtistListRow {
  const bio = loc(a.bio)
  return { id: a.id, name: a.name, slug: a.slug, country: a.country, is_roster: a.roster, bio_en: bio.en, bio_es: bio.es }
}

export async function listArtists(rawQ: string | undefined, rawPage: string | undefined, rosterOnly: boolean) {
  const q = term(rawQ)
  const page = pageFrom(rawPage)
  const from = (page - 1) * PAGE_SIZE
  let rows = (await catalogFile()).artists.map(artistRow).sort((a, b) => a.name.localeCompare(b.name))
  if (q) rows = rows.filter((row) => matches(row.name, q))
  if (rosterOnly) rows = rows.filter((row) => row.is_roster)
  const n = rows.length
  return { q, page, pages: Math.max(1, Math.ceil(n / PAGE_SIZE)), total: n, rows: rows.slice(from, from + PAGE_SIZE) }
}

export type ArtistEdit = ArtistListRow & {
  image_url: string | null
  beatport_url: string | null
  bandcamp_url: string | null
  spotify_url: string | null
  soundcloud_url: string | null
  instagram_url: string | null
}

export async function getArtist(id: number) {
  const artist = (await catalogFile()).artists.find((a) => a.id === id)
  if (!artist) return null
  return {
    ...artistRow(artist),
    image_url: artist.image,
    beatport_url: artist.links.beatport || null,
    bandcamp_url: artist.links.bandcamp || null,
    spotify_url: artist.links.spotify || null,
    soundcloud_url: artist.links.soundcloud || null,
    instagram_url: artist.links.instagram || null,
  } satisfies ArtistEdit
}

export type ReleaseListRow = {
  id: number
  slug: string
  catalog_number: string | null
  title: string
  release_date: string
  type: string
  is_featured: boolean
  note_en: string | null
  note_es: string | null
}

function releaseRow(r: Release): ReleaseListRow {
  const note = loc(r.note)
  return {
    id: r.id,
    slug: r.slug,
    catalog_number: r.catalog,
    title: r.title,
    release_date: r.releaseDate,
    type: r.type,
    is_featured: r.featured,
    note_en: note.en,
    note_es: note.es,
  }
}

export async function listReleases(rawQ: string | undefined, rawPage: string | undefined, featuredOnly: boolean) {
  const q = term(rawQ)
  const page = pageFrom(rawPage)
  const from = (page - 1) * PAGE_SIZE
  let rows = [...(await catalogFile()).releases]
    .sort((a, b) => (a.releaseDate === b.releaseDate ? b.id - a.id : a.releaseDate < b.releaseDate ? 1 : -1))
    .map(releaseRow)
  if (q) rows = rows.filter((row) => matches(row.title, q) || matches(row.catalog_number || '', q))
  if (featuredOnly) rows = rows.filter((row) => row.is_featured)
  const n = rows.length
  return { q, page, pages: Math.max(1, Math.ceil(n / PAGE_SIZE)), total: n, rows: rows.slice(from, from + PAGE_SIZE) }
}

export type ReleaseEdit = ReleaseListRow & {
  artwork_url: string | null
  beatport_url: string | null
  bandcamp_url: string | null
  spotify_url: string | null
  tidal_url: string | null
  apple_music_url: string | null
}

export async function getRelease(id: number) {
  const release = (await catalogFile()).releases.find((r) => r.id === id)
  if (!release) return null
  return {
    ...releaseRow(release),
    artwork_url: release.artwork,
    beatport_url: release.links.beatport || null,
    bandcamp_url: release.links.bandcamp || null,
    spotify_url: release.links.spotify || null,
    tidal_url: release.links.tidal || null,
    apple_music_url: release.links.apple || null,
  } satisfies ReleaseEdit
}

export type TrackHit = {
  id: number
  title: string
  mix_name: string | null
  spotify_url: string | null
  tidal_url: string | null
  releases: { catalog_number: string | null; title: string; slug: string } | null
}

function trackRelease(catalog: Catalog, track: Track): TrackHit['releases'] {
  const release = catalog.releases.find((r) => r.id === track.releaseId)
  return release ? { catalog_number: release.catalog, title: release.title, slug: release.slug } : null
}

export async function searchTracks(rawQ: string | undefined) {
  const q = term(rawQ)
  if (q.length < 2) return { q, tidal: true, rows: [] as TrackHit[] }
  const catalog = await catalogFile()
  const rows = catalog.tracks
    .filter((track) => matches(track.title, q))
    .sort((a, b) => a.title.localeCompare(b.title))
    .slice(0, 40)
    .map(
      (track): TrackHit => ({
        id: track.id,
        title: track.title,
        mix_name: track.mix || null,
        spotify_url: track.spotifyUrl,
        tidal_url: track.tidalUrl || null,
        releases: trackRelease(catalog, track),
      }),
    )
  return { q, tidal: true, rows }
}

export type TrackEdit = {
  id: number
  title: string
  mix_name: string | null
  spotify_url: string | null
  tidal_url: string | null
  beatport_url: string | null
  isrc: string | null
  releases: { id: number; catalog_number: string | null; title: string; slug: string } | null
}

export async function getTrack(id: number) {
  const catalog = await catalogFile()
  const track = catalog.tracks.find((t) => t.id === id)
  if (!track) return null
  const release = catalog.releases.find((r) => r.id === track.releaseId)
  return {
    id: track.id,
    title: track.title,
    mix_name: track.mix || null,
    spotify_url: track.spotifyUrl,
    tidal_url: track.tidalUrl || null,
    beatport_url: track.beatportUrl,
    isrc: track.isrc,
    releases: release
      ? { id: release.id, catalog_number: release.catalog, title: release.title, slug: release.slug }
      : null,
  } satisfies TrackEdit
}

/** Preview counts lived in Supabase. They are not recorded anymore. */
export async function playSummary() {
  await gate()
  return { total: 0, month: 0, artists: [] as { id: number; name: string; plays: number }[], tracks: [] as { id: number; title: string; mix: string; artistNames: string[]; plays: number }[] }
}
