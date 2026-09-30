/**
 * Turns raw Beatport blobs (tracks, releases, artists) into the site's Catalog shape.
 * Pure: no network, no DB. Used by the CLI importer and the cron route.
 */
import { slugify } from '../format'
import type { Artist, Catalog, Release, ReleaseType, Track } from '../types'
import { BEATPORT, type Blob } from './scrape'

const img = (i: Blob | undefined | null): string | null =>
  (i?.dynamic_uri as string) || (i?.uri as string) || null

const isoDate = (v: unknown): string | null => {
  const m = String(v ?? '').match(/^(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

const lengthOf = (t: Blob): string | null => {
  if (typeof t.length === 'string' && t.length) return t.length
  const ms = Number(t.length_ms)
  if (!ms) return null
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

interface ReleaseDraft {
  id: number
  name: string
  bpSlug: string
  catalog: string | null
  date: string | null
  artwork: string | null
  upc: string | null
  artistIds: number[]
  remixerIds: number[]
  trackCountHint: number
}

export class CatalogBuilder {
  private artists = new Map<number, Artist>()
  private releases = new Map<number, ReleaseDraft>()
  private tracks = new Map<number, Track & { order: number }>()

  addArtist(a: Blob | null | undefined): number | null {
    const id = Number(a?.id)
    if (!id || !a?.name) return null
    const existing = this.artists.get(id)
    const image = img(a.image)
    if (existing) {
      if (!existing.image && image) existing.image = image
      return id
    }
    const slug = String(a.slug || slugify(a.name))
    this.artists.set(id, {
      id,
      slug,
      name: String(a.name),
      image,
      country: null,
      bio: null,
      links: { beatport: `${BEATPORT}/artist/${slug}/${id}` },
      roster: false,
    })
    return id
  }

  private ids(list: Blob[] | undefined): number[] {
    return (list || []).map((a) => this.addArtist(a)).filter((x): x is number => x !== null)
  }

  /** Release object from a listing or a /release page. Richer data wins over poorer data. */
  addRelease(r: Blob | null | undefined): number | null {
    const id = Number(r?.id)
    if (!id) return null
    const cur = this.releases.get(id)
    const artistIds = this.ids(r!.artists)
    const remixerIds = this.ids(r!.remixers)
    const draft: ReleaseDraft = {
      id,
      name: String(r!.name ?? cur?.name ?? ''),
      bpSlug: String(r!.slug ?? cur?.bpSlug ?? slugify(String(r!.name ?? ''))),
      catalog: (r!.catalog_number as string) || cur?.catalog || null,
      date: isoDate(r!.new_release_date) || isoDate(r!.publish_date) || cur?.date || null,
      artwork: img(r!.image) || (r!.image_url as string) || cur?.artwork || null,
      upc: (r!.upc as string) || cur?.upc || null,
      artistIds: artistIds.length ? artistIds : cur?.artistIds || [],
      remixerIds: remixerIds.length ? remixerIds : cur?.remixerIds || [],
      trackCountHint: Number(r!.track_count || cur?.trackCountHint || 0),
    }
    this.releases.set(id, draft)
    return id
  }

  addTrack(t: Blob | null | undefined, order = 0): number | null {
    const id = Number(t?.id)
    const releaseId = Number(t?.release?.id)
    if (!id || !releaseId || !t?.name) return null
    if (!this.releases.has(releaseId)) {
      // minimal release from the track blob; completed later by addRelease(release page)
      this.addRelease({ ...t.release, publish_date: t.release?.publish_date || t.publish_date || t.new_release_date })
    }
    const slug = String(t.slug || slugify(t.name))
    this.tracks.set(id, {
      id,
      releaseId,
      position: Number(t.number || t.track_number || 0),
      order,
      title: String(t.name),
      mix: String(t.mix_name || ''),
      bpm: Number(t.bpm) > 0 ? Number(t.bpm) : null,
      key: (t.key?.name as string) || (typeof t.key === 'string' ? t.key : null),
      genre: (t.genre?.name as string) || null,
      length: lengthOf(t),
      isrc: (t.isrc as string) || null,
      sampleUrl: (t.sample_url as string) || null,
      beatportUrl: `${BEATPORT}/track/${slug}/${id}`,
      spotifyUrl: null,
      artistIds: this.ids(t.artists),
      remixerIds: this.ids(t.remixers),
    })
    return id
  }

  hasRelease(id: number): boolean {
    return this.releases.has(id)
  }

  releaseIds(): number[] {
    return [...this.releases.keys()]
  }

  releaseSlug(id: number): string {
    return this.releases.get(id)?.bpSlug || 'release'
  }

  build(): Catalog {
    const tracksByRelease = new Map<number, (Track & { order: number })[]>()
    for (const t of this.tracks.values()) {
      if (!tracksByRelease.has(t.releaseId)) tracksByRelease.set(t.releaseId, [])
      tracksByRelease.get(t.releaseId)!.push(t)
    }

    const usedSlugs = new Set<string>()
    const releases: Release[] = []
    const tracks: Track[] = []

    for (const d of this.releases.values()) {
      const ts = (tracksByRelease.get(d.id) || []).sort(
        (a, b) => (a.position || 1e9) - (b.position || 1e9) || a.order - b.order || a.id - b.id,
      )
      ts.forEach((t, i) => {
        const { order: _o, ...clean } = t
        void _o
        tracks.push({ ...clean, position: i + 1 })
      })

      // genres: most frequent first
      const freq = new Map<string, number>()
      ts.forEach((t) => t.genre && freq.set(t.genre, (freq.get(t.genre) || 0) + 1))
      const genres = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g)

      // main artists: release artists, else union of track artists
      const trackArtists = new Set<number>()
      ts.forEach((t) => t.artistIds.forEach((a) => trackArtists.add(a)))
      const artistIds = d.artistIds.length ? d.artistIds : [...trackArtists]
      const remixers = new Set<number>(d.remixerIds)
      ts.forEach((t) => t.remixerIds.forEach((a) => remixers.add(a)))

      const trackCount = ts.length || d.trackCountHint
      let slug = slugify([d.catalog, d.name].filter(Boolean).join(' ')) || `release-${d.id}`
      if (usedSlugs.has(slug)) slug = `${slug}-${d.id}`
      usedSlugs.add(slug)

      releases.push({
        id: d.id,
        slug,
        catalog: d.catalog,
        title: d.name,
        type: inferType(d.catalog, trackCount, trackArtists.size || artistIds.length),
        releaseDate: d.date || new Date().toISOString().slice(0, 10),
        artwork: d.artwork,
        genres,
        artistIds: artistIds.length > 4 ? [] : artistIds, // compilations show "Various Artists"
        remixerIds: [...remixers],
        upc: d.upc,
        series: seriesOf(d.name),
        links: { beatport: `${BEATPORT}/release/${d.bpSlug}/${d.id}` },
        note: null,
        featured: false,
      })
    }

    // unique artist slugs
    const artistSlugs = new Set<string>()
    const artists = [...this.artists.values()].map((a) => {
      let slug = a.slug
      if (artistSlugs.has(slug)) slug = `${slug}-${a.id}`
      artistSlugs.add(slug)
      return { ...a, slug }
    })

    return { updatedAt: new Date().toISOString(), artists, releases, tracks }
  }
}

export function inferType(catalog: string | null, trackCount: number, artistCount: number): ReleaseType {
  const many = artistCount > 4
  if (/^DKRLP/i.test(catalog || '') || trackCount >= 6) return many ? 'compilation' : 'album'
  if (trackCount >= 3) return many ? 'compilation' : 'ep'
  return 'single'
}

/** Recurring compilation series detected from the title. Extend as needed. */
export function seriesOf(title: string): string | null {
  const t = title.toLowerCase()
  if (t.includes('universal breaks')) return 'Universal Breaks'
  if (t.includes('we are dkr')) return 'WE ARE DKR'
  if (/rave\s*\/\s*jungle/.test(t)) return 'Rave / Jungle / D&B'
  return null
}

/**
 * Keeps editorial fields from a previous catalogue (bios, roster flag, manual links,
 * notes, featured, Bandcamp/Spotify links) when re-importing into the JSON file.
 */
export function mergeEditorial(fresh: Catalog, previous: Catalog | null): Catalog {
  if (!previous) return fresh
  const pa = new Map(previous.artists.map((a) => [a.id, a]))
  const pr = new Map(previous.releases.map((r) => [r.id, r]))
  const pt = new Map(previous.tracks.map((t) => [t.id, t]))
  return {
    ...fresh,
    artists: fresh.artists.map((a) => {
      const o = pa.get(a.id)
      return o
        ? { ...a, bio: o.bio, roster: o.roster, country: o.country, image: o.image || a.image, links: { ...o.links, ...a.links, ...pick(o.links) } }
        : a
    }),
    releases: fresh.releases.map((r) => {
      const o = pr.get(r.id)
      return o ? { ...r, note: o.note, featured: o.featured, series: o.series || r.series, links: { ...r.links, ...pick(o.links) } } : r
    }),
    tracks: fresh.tracks.map((t) => {
      const o = pt.get(t.id)
      return o ? { ...t, spotifyUrl: o.spotifyUrl || t.spotifyUrl, tidalUrl: o.tidalUrl || t.tidalUrl || null } : t
    }),
  }
}

/** Editorial link fields that the importer never produces itself. */
function pick(l: Artist['links']): Artist['links'] {
  const out: Artist['links'] = {}
  if (l.bandcamp) out.bandcamp = l.bandcamp
  if (l.spotify) out.spotify = l.spotify
  if (l.tidal) out.tidal = l.tidal
  if (l.apple) out.apple = l.apple
  if (l.soundcloud) out.soundcloud = l.soundcloud
  if (l.instagram) out.instagram = l.instagram
  return out
}
