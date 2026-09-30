/**
 * Writes an imported Catalog into Supabase (tables from supabase/migrations/001_init.sql).
 * Uses the SERVICE ROLE key (server only). Only importer-owned columns are sent, so an upsert
 * never overwrites editorial columns (bios, roster, notes, featured, manual links).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Catalog } from '../types'

export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, { auth: { persistSession: false } })
}

const chunks = <T,>(arr: T[], n = 500): T[][] => {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export async function knownReleaseIds(sb: SupabaseClient): Promise<Set<number>> {
  const ids = new Set<number>()
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('releases').select('id').range(from, from + 999)
    if (error) throw new Error(`releases ids: ${error.message}`)
    ;(data || []).forEach((r) => ids.add(Number(r.id)))
    if (!data || data.length < 1000) break
  }
  return ids
}

async function upsert(sb: SupabaseClient, table: string, rows: Record<string, unknown>[], onConflict = 'id') {
  for (const part of chunks(rows)) {
    const { error } = await sb.from(table).upsert(part, { onConflict })
    if (error) throw new Error(`${table}: ${error.message}`)
  }
}

export async function writeCatalogToSupabase(sb: SupabaseClient, c: Catalog, log: (m: string) => void = () => {}) {
  const now = new Date().toISOString()

  await upsert(
    sb,
    'artists',
    c.artists.map((a) => ({ id: a.id, slug: a.slug, name: a.name, image_url: a.image, beatport_url: a.links.beatport || null })),
  )
  log(`artists: ${c.artists.length}`)

  await upsert(
    sb,
    'releases',
    c.releases.map((r) => ({
      id: r.id,
      slug: r.slug,
      catalog_number: r.catalog,
      title: r.title,
      type: r.type,
      release_date: r.releaseDate,
      artwork_url: r.artwork,
      genres: r.genres,
      upc: r.upc,
      series: r.series,
      beatport_url: r.links.beatport || null,
      last_synced_at: now,
    })),
  )
  log(`releases: ${c.releases.length}`)

  await upsert(
    sb,
    'tracks',
    c.tracks.map((t) => ({
      id: t.id,
      release_id: t.releaseId,
      position: t.position,
      title: t.title,
      mix_name: t.mix,
      bpm: t.bpm,
      music_key: t.key,
      genre: t.genre,
      length: t.length,
      isrc: t.isrc,
      sample_url: t.sampleUrl,
      beatport_url: t.beatportUrl,
    })),
  )
  log(`tracks: ${c.tracks.length}`)

  // credits: replace for the releases / tracks in this batch
  const relIds = c.releases.map((r) => r.id)
  for (const part of chunks(relIds, 200)) {
    const { error } = await sb.from('release_artists').delete().in('release_id', part)
    if (error) throw new Error(`release_artists delete: ${error.message}`)
  }
  await upsert(
    sb,
    'release_artists',
    c.releases.flatMap((r) => [
      ...[...new Set(r.artistIds)].map((artist_id, position) => ({ release_id: r.id, artist_id, role: 'primary', position })),
      ...[...new Set(r.remixerIds)].map((artist_id, position) => ({ release_id: r.id, artist_id, role: 'remixer', position })),
    ]),
    'release_id,artist_id,role',
  )

  const trkIds = c.tracks.map((t) => t.id)
  for (const part of chunks(trkIds, 200)) {
    const { error } = await sb.from('track_artists').delete().in('track_id', part)
    if (error) throw new Error(`track_artists delete: ${error.message}`)
  }
  await upsert(
    sb,
    'track_artists',
    c.tracks.flatMap((t) => [
      ...[...new Set(t.artistIds)].map((artist_id, position) => ({ track_id: t.id, artist_id, role: 'primary', position })),
      ...[...new Set(t.remixerIds)].map((artist_id, position) => ({ track_id: t.id, artist_id, role: 'remixer', position })),
    ]),
    'track_id,artist_id,role',
  )
  log('credits written')
}
