import seed from '../../data/catalog.seed.json'
import { isSupabaseEnabled, loadCatalogFromSupabase } from './supabase'
import { isUpcoming, slugify } from './format'
import type { Artist, Catalog, Genre, Release, Track } from './types'

/**
 * Single entry point for data.
 * - No Supabase env vars  -> data/catalog.seed.json
 * - Supabase env vars set -> Postgres, with streaming links from the JSON
 *   filled in when the database cell is still empty.
 */
function overlayStreaming(live: Catalog, file: Catalog): Catalog {
  const tracks = new Map(file.tracks.map((t) => [t.id, t]))
  const releases = new Map(file.releases.map((r) => [r.id, r]))
  return {
    ...live,
    tracks: live.tracks.map((t) => {
      const o = tracks.get(t.id)
      if (!o) return t
      return { ...t, spotifyUrl: t.spotifyUrl || o.spotifyUrl || null, tidalUrl: t.tidalUrl || o.tidalUrl || null }
    }),
    releases: live.releases.map((r) => {
      const o = releases.get(r.id)
      if (!o) return r
      return { ...r, links: { ...r.links, spotify: r.links.spotify || o.links.spotify, tidal: r.links.tidal || o.links.tidal } }
    }),
  }
}

export async function getCatalog(): Promise<Catalog> {
  const file = seed as unknown as Catalog
  if (!isSupabaseEnabled()) return file
  return overlayStreaming(await loadCatalogFromSupabase(), file)
}

/* ---------------------------------------------------------------- releases */

export function sortedReleases(c: Catalog): Release[] {
  return [...c.releases].sort((a, b) =>
    a.releaseDate === b.releaseDate ? b.id - a.id : a.releaseDate < b.releaseDate ? 1 : -1,
  )
}

export function releasedReleases(c: Catalog): Release[] {
  return sortedReleases(c).filter((r) => !isUpcoming(r))
}

/** Upcoming releases, soonest first. */
export function upcomingReleases(c: Catalog): Release[] {
  return sortedReleases(c)
    .filter((r) => isUpcoming(r))
    .reverse()
}

export function latestRelease(c: Catalog): Release | null {
  const featured = releasedReleases(c).find((r) => r.featured)
  return featured || releasedReleases(c)[0] || sortedReleases(c)[0] || null
}

export function findRelease(c: Catalog, slug: string): Release | null {
  return c.releases.find((r) => r.slug === slug) || null
}

export function findReleaseByCatalog(c: Catalog, code: string): Release | null {
  const k = code.toLowerCase()
  return c.releases.find((r) => (r.catalog || '').toLowerCase() === k) || null
}

export function tracksFor(c: Catalog, releaseId: number): Track[] {
  return c.tracks.filter((t) => t.releaseId === releaseId).sort((a, b) => a.position - b.position)
}

/* ----------------------------------------------------------------- artists */

export function artistMap(c: Catalog): Map<number, Artist> {
  return new Map(c.artists.map((a) => [a.id, a]))
}

export function artistsByIds(c: Catalog, ids: number[]): Artist[] {
  const m = artistMap(c)
  return ids.map((id) => m.get(id)).filter((a): a is Artist => Boolean(a))
}

export function findArtist(c: Catalog, slug: string): Artist | null {
  return c.artists.find((a) => a.slug === slug) || null
}

/** Releases where the artist is a main artist on the release or on any of its tracks. */
export function releasesByArtist(c: Catalog, artistId: number): Release[] {
  const fromTracks = new Set(c.tracks.filter((t) => t.artistIds.includes(artistId)).map((t) => t.releaseId))
  return sortedReleases(c).filter((r) => r.artistIds.includes(artistId) || fromTracks.has(r.id))
}

/** Releases where the artist only appears as remixer. */
export function remixesByArtist(c: Catalog, artistId: number): Release[] {
  const own = new Set(releasesByArtist(c, artistId).map((r) => r.id))
  const fromTracks = new Set(c.tracks.filter((t) => t.remixerIds.includes(artistId)).map((t) => t.releaseId))
  return sortedReleases(c).filter(
    (r) => !own.has(r.id) && (r.remixerIds.includes(artistId) || fromTracks.has(r.id)),
  )
}

/**
 * Every track the artist plays on (as artist or remixer), newest release first, in tracklist order.
 * Used for the listenable list on the artist page.
 */
export function tracksByArtist(c: Catalog, artistId: number): { track: Track; release: Release }[] {
  const rel = new Map(c.releases.map((r) => [r.id, r]))
  return c.tracks
    .filter((t) => {
      const r = rel.get(t.releaseId)
      if (!r) return false
      if (t.artistIds.includes(artistId) || t.remixerIds.includes(artistId)) return true
      return t.artistIds.length === 0 && r.artistIds.includes(artistId)
    })
    .map((t) => ({ track: t, release: rel.get(t.releaseId)! }))
    .sort((a, b) =>
      a.release.releaseDate === b.release.releaseDate
        ? a.release.id - b.release.id || a.track.position - b.track.position
        : a.release.releaseDate < b.release.releaseDate
          ? 1
          : -1,
    )
}

export interface ArtistWithCount extends Artist {
  releaseCount: number
}

/** All artists with at least one credit, roster first, then by number of releases. */
export function artistsWithCounts(c: Catalog): ArtistWithCount[] {
  const counts = new Map<number, Set<number>>()
  const add = (id: number, rel: number) => {
    if (!counts.has(id)) counts.set(id, new Set())
    counts.get(id)!.add(rel)
  }
  for (const r of c.releases) {
    r.artistIds.forEach((id) => add(id, r.id))
    r.remixerIds.forEach((id) => add(id, r.id))
  }
  for (const t of c.tracks) {
    t.artistIds.forEach((id) => add(id, t.releaseId))
    t.remixerIds.forEach((id) => add(id, t.releaseId))
  }
  return c.artists
    .map((a) => ({ ...a, releaseCount: counts.get(a.id)?.size || 0 }))
    .filter((a) => a.releaseCount > 0 || a.roster)
    .sort((a, b) => Number(b.roster) - Number(a.roster) || b.releaseCount - a.releaseCount || a.name.localeCompare(b.name))
}

/* ------------------------------------------------------------------ genres */

export function genres(c: Catalog): Genre[] {
  const m = new Map<string, Genre>()
  for (const r of c.releases) {
    for (const g of r.genres) {
      const slug = slugify(g)
      const cur = m.get(slug) || { slug, name: g, count: 0 }
      cur.count++
      m.set(slug, cur)
    }
  }
  return [...m.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export function releasesByGenre(c: Catalog, genreSlug: string): Release[] {
  return sortedReleases(c).filter((r) => r.genres.some((g) => slugify(g) === genreSlug))
}

/* ------------------------------------------------------------------ labels */

export function artistNames(c: Catalog, r: Release): string[] {
  const names = artistsByIds(c, r.artistIds).map((a) => a.name)
  if (names.length) return names
  const fromTracks = new Set<number>()
  tracksFor(c, r.id).forEach((t) => t.artistIds.forEach((id) => fromTracks.add(id)))
  const n = artistsByIds(c, [...fromTracks]).map((a) => a.name)
  if (r.type === 'compilation' || n.length > 3) return ['Various Artists']
  return n
}
