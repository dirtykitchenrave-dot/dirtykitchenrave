import { cache } from 'react'
import { redirect } from 'next/navigation'
import { serviceClient } from './beatport/sinks'
import { loadPlayedChart } from './supabase'
import { getAdminUser } from './admin-auth'

export const PAGE_SIZE = 40

export const BOOKING_STATUS = [
  { value: 'new', label: 'Nueva' },
  { value: 'reviewing', label: 'En revisión' },
  { value: 'offered', label: 'Ofertada' },
  { value: 'confirmed', label: 'Confirmada' },
  { value: 'declined', label: 'Rechazada' },
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
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Europe/London',
  }).format(d)
}

export function formatStamp(iso: string) {
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Madrid',
  }).format(new Date(iso))
}

async function db() {
  if (!(await getAdminUser())) redirect('/administrator/login')
  return serviceClient()
}

/** Migration 002 is in the repo. The live database may not have the column yet. */
export const tidalColumn = cache(async () => {
  const client = await db()
  const { error } = await client.from('releases').select('tidal_url').limit(1)
  if (!error) return true
  if (/tidal_url/.test(error.message)) return false
  throw new Error(error.message)
})

type Filter = { eq?: [string, string | boolean]; gte?: [string, string] }

async function count(table: string, filter?: Filter) {
  const client = await db()
  let q = client.from(table).select('*', { count: 'exact', head: true })
  if (filter?.eq) q = q.eq(filter.eq[0], filter.eq[1])
  if (filter?.gte) q = q.gte(filter.gte[0], filter.gte[1])
  const { count: n, error } = await q
  if (error) throw new Error(error.message)
  return n || 0
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
  const client = await db()
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [artists, releases, tracks, plays, playsMonth, bookings, bookingsNew, roster, featuredRows, latest] =
    await Promise.all([
      count('artists'),
      count('releases'),
      count('tracks'),
      count('track_play_events'),
      count('track_play_events', { gte: ['played_at', since] }),
      count('booking_requests'),
      count('booking_requests', { eq: ['status', 'new'] }),
      count('artists', { eq: ['is_roster', true] }),
      client
        .from('releases')
        .select('title, catalog_number, slug')
        .eq('is_featured', true)
        .order('release_date', { ascending: false })
        .limit(1),
      client
        .from('booking_requests')
        .select('id, contact_name, organisation, event_name, city, event_date, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5),
    ])
  if (featuredRows.error) throw new Error(featuredRows.error.message)
  if (latest.error) throw new Error(latest.error.message)
  const featured = featuredRows.data?.[0] || null
  return {
    artists,
    releases,
    tracks,
    plays,
    playsMonth,
    bookings,
    bookingsNew,
    roster,
    featured: featured
      ? { title: String(featured.title), catalog: featured.catalog_number ? String(featured.catalog_number) : '', slug: String(featured.slug) }
      : null,
    latest: (latest.data || []) as Pick<
      BookingRow,
      'id' | 'contact_name' | 'organisation' | 'event_name' | 'city' | 'event_date' | 'status' | 'created_at'
    >[],
  }
}

export async function listBookings(status: BookingStatus | '') {
  const client = await db()
  let q = client.from('booking_requests').select('*').order('created_at', { ascending: false }).limit(200)
  if (status) q = q.eq('status', status)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data || []) as BookingRow[]
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

export async function listArtists(rawQ: string | undefined, rawPage: string | undefined, rosterOnly: boolean) {
  const client = await db()
  const q = term(rawQ)
  const page = pageFrom(rawPage)
  const from = (page - 1) * PAGE_SIZE
  let query = client
    .from('artists')
    .select('id, name, slug, country, is_roster, bio_en, bio_es', { count: 'exact' })
    .order('name', { ascending: true })
  if (q) query = query.ilike('name', `%${q}%`)
  if (rosterOnly) query = query.eq('is_roster', true)
  const { data, error, count: total } = await query.range(from, from + PAGE_SIZE - 1)
  if (error) throw new Error(error.message)
  const n = total || 0
  return { q, page, pages: Math.max(1, Math.ceil(n / PAGE_SIZE)), total: n, rows: (data || []) as ArtistListRow[] }
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
  const client = await db()
  const { data, error } = await client
    .from('artists')
    .select('id, name, slug, country, is_roster, bio_en, bio_es, image_url, beatport_url, bandcamp_url, spotify_url, soundcloud_url, instagram_url')
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as ArtistEdit | null) || null
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

export async function listReleases(rawQ: string | undefined, rawPage: string | undefined, featuredOnly: boolean) {
  const client = await db()
  const q = term(rawQ)
  const page = pageFrom(rawPage)
  const from = (page - 1) * PAGE_SIZE
  let query = client
    .from('releases')
    .select('id, slug, catalog_number, title, release_date, type, is_featured, note_en, note_es', { count: 'exact' })
    .order('release_date', { ascending: false })
    .order('id', { ascending: false })
  if (q) {
    const like = `"%${q.replace(/"/g, '')}%"`
    query = query.or(`title.ilike.${like},catalog_number.ilike.${like}`)
  }
  if (featuredOnly) query = query.eq('is_featured', true)
  const { data, error, count: total } = await query.range(from, from + PAGE_SIZE - 1)
  if (error) throw new Error(error.message)
  const n = total || 0
  return { q, page, pages: Math.max(1, Math.ceil(n / PAGE_SIZE)), total: n, rows: (data || []) as ReleaseListRow[] }
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
  const client = await db()
  const tidal = await tidalColumn()
  const { data, error } = await client
    .from('releases')
    .select(
      `id, slug, catalog_number, title, release_date, type, is_featured, note_en, note_es, artwork_url, beatport_url, bandcamp_url, spotify_url, apple_music_url${tidal ? ', tidal_url' : ''}`,
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return (data as ReleaseEdit | null) || null
}

export type TrackHit = {
  id: number
  title: string
  mix_name: string | null
  spotify_url: string | null
  tidal_url: string | null
  releases: { catalog_number: string | null; title: string; slug: string } | null
}

export async function searchTracks(rawQ: string | undefined) {
  const q = term(rawQ)
  if (q.length < 2) return { q, tidal: false, rows: [] as TrackHit[] }
  const client = await db()
  const tidal = await tidalColumn()
  const { data, error } = await client
    .from('tracks')
    .select(`id, title, mix_name, spotify_url${tidal ? ', tidal_url' : ''}, releases(catalog_number, title, slug)`)
    .ilike('title', `%${q}%`)
    .order('title', { ascending: true })
    .limit(40)
  if (error) throw new Error(error.message)
  return {
    q,
    tidal,
    rows: ((data || []) as unknown as TrackHit[]).map((row) => ({
      ...row,
      releases: Array.isArray(row.releases) ? row.releases[0] || null : row.releases,
    })),
  }
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
  const client = await db()
  const tidal = await tidalColumn()
  const { data, error } = await client
    .from('tracks')
    .select(
      `id, title, mix_name, spotify_url, beatport_url, isrc${tidal ? ', tidal_url' : ''}, releases(id, catalog_number, title, slug)`,
    )
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(error.message)
  if (!data) return null
  const row = data as unknown as TrackEdit
  return { ...row, releases: Array.isArray(row.releases) ? row.releases[0] || null : row.releases }
}

export async function playSummary() {
  if (!(await getAdminUser())) redirect('/administrator/login')
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [total, month, chart] = await Promise.all([
    count('track_play_events'),
    count('track_play_events', { gte: ['played_at', since] }),
    loadPlayedChart(10),
  ])
  return { total, month, artists: chart.artists, tracks: chart.tracks }
}
