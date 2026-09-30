import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Artist, Catalog, Release, ReleaseType, Track } from './types'

/**
 * Supabase adapter. Only used when both env vars are set.
 * Table layout: supabase/migrations/001_init.sql
 */

export function isSupabaseEnabled(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

let client: SupabaseClient | null = null
function sb(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { persistSession: false },
    })
  }
  return client
}

/** Supabase returns max 1000 rows per request: page through the whole table. */
async function fetchAll<T>(table: string, columns = '*'): Promise<T[]> {
  const PAGE = 1000
  const out: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await sb()
      .from(table)
      .select(columns)
      .range(from, from + PAGE - 1)
    if (error) throw new Error(`Supabase ${table}: ${error.message}`)
    out.push(...((data || []) as T[]))
    if (!data || data.length < PAGE) break
  }
  return out
}

type Row = Record<string, unknown>
const s = (v: unknown) => (v == null || v === '' ? null : String(v))
const n = (v: unknown) => (v == null || v === '' ? null : Number(v))

export async function loadCatalogFromSupabase(): Promise<Catalog> {
  const [artists, releases, tracks, releaseArtists, trackArtists] = await Promise.all([
    fetchAll<Row>('artists'),
    fetchAll<Row>('releases'),
    fetchAll<Row>('tracks'),
    fetchAll<Row>('release_artists'),
    fetchAll<Row>('track_artists'),
  ])

  const relCredits = new Map<number, { a: number[]; r: number[] }>()
  for (const ra of releaseArtists) {
    const id = Number(ra.release_id)
    const cur = relCredits.get(id) || { a: [], r: [] }
    ;(ra.role === 'remixer' ? cur.r : cur.a).push(Number(ra.artist_id))
    relCredits.set(id, cur)
  }
  const trkCredits = new Map<number, { a: number[]; r: number[] }>()
  for (const ta of trackArtists) {
    const id = Number(ta.track_id)
    const cur = trkCredits.get(id) || { a: [], r: [] }
    ;(ta.role === 'remixer' ? cur.r : cur.a).push(Number(ta.artist_id))
    trkCredits.set(id, cur)
  }

  const mapArtist = (a: Row): Artist => ({
    id: Number(a.id),
    slug: String(a.slug),
    name: String(a.name),
    image: s(a.image_url),
    country: s(a.country),
    bio: a.bio_en || a.bio_es ? { en: String(a.bio_en || a.bio_es || ''), es: String(a.bio_es || a.bio_en || '') } : null,
    links: {
      beatport: s(a.beatport_url),
      bandcamp: s(a.bandcamp_url),
      spotify: s(a.spotify_url),
      soundcloud: s(a.soundcloud_url),
      instagram: s(a.instagram_url),
    },
    roster: Boolean(a.is_roster),
  })

  const mapRelease = (r: Row): Release => {
    const id = Number(r.id)
    const credits = relCredits.get(id) || { a: [], r: [] }
    return {
      id,
      slug: String(r.slug),
      catalog: s(r.catalog_number),
      title: String(r.title),
      type: (s(r.type) || 'single') as ReleaseType,
      releaseDate: String(r.release_date).slice(0, 10),
      artwork: s(r.artwork_url),
      genres: Array.isArray(r.genres) ? (r.genres as string[]) : [],
      artistIds: credits.a,
      remixerIds: credits.r,
      upc: s(r.upc),
      series: s(r.series),
      links: {
        beatport: s(r.beatport_url),
        bandcamp: s(r.bandcamp_url),
        spotify: s(r.spotify_url),
        tidal: s(r.tidal_url),
        apple: s(r.apple_music_url),
      },
      note: r.note_en || r.note_es ? { en: String(r.note_en || r.note_es || ''), es: String(r.note_es || r.note_en || '') } : null,
      featured: Boolean(r.is_featured),
    }
  }

  const mapTrack = (t: Row): Track => {
    const id = Number(t.id)
    const credits = trkCredits.get(id) || { a: [], r: [] }
    return {
      id,
      releaseId: Number(t.release_id),
      position: Number(t.position || 0),
      title: String(t.title),
      mix: String(t.mix_name || ''),
      bpm: n(t.bpm),
      key: s(t.music_key),
      genre: s(t.genre),
      length: s(t.length),
      isrc: s(t.isrc),
      sampleUrl: s(t.sample_url),
      beatportUrl: s(t.beatport_url),
      spotifyUrl: s(t.spotify_url),
      tidalUrl: s(t.tidal_url),
      artistIds: credits.a,
      remixerIds: credits.r,
    }
  }

  return {
    updatedAt: new Date().toISOString(),
    artists: artists.map(mapArtist),
    releases: releases.map(mapRelease),
    tracks: tracks.map(mapTrack),
  }
}
