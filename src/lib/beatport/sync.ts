/**
 * Orchestrates a Beatport import.
 *  - full:        every page of /label/.../tracks + every release page (≈ 413 releases, ~8 min with throttling)
 *  - incremental: first page(s) of /tracks + pre-orders; only releases not yet known get their release page fetched
 * Output is a Catalog; sinks (JSON file / Supabase) live in ./sinks.ts.
 */
import type { Catalog } from '../types'
import { CatalogBuilder } from './build'
import { fetchLabelPreorders, fetchLabelTracksPage, fetchReleasePage, sleep } from './scrape'

export interface SyncOptions {
  mode: 'full' | 'incremental'
  /** Release ids already stored (incremental: their release page is not fetched again). */
  knownReleaseIds?: Set<number>
  /** Pages of 150 tracks to read in incremental mode (default 1). */
  incrementalPages?: number
  /** Hard cap on track pages (debugging). */
  maxPages?: number
  /** Pause between Beatport requests, in ms (default 900). */
  delayMs?: number
  log?: (msg: string) => void
}

export interface SyncResult {
  catalog: Catalog
  newReleaseIds: number[]
  pagesRead: number
  releasePagesRead: number
  errors: string[]
}

export async function scrapeBeatport(opts: SyncOptions): Promise<SyncResult> {
  const log = opts.log || (() => {})
  const delay = opts.delayMs ?? 900
  const known = opts.knownReleaseIds || new Set<number>()
  const b = new CatalogBuilder()
  const errors: string[] = []

  // 1) tracks listing
  const maxPages =
    opts.mode === 'full' ? opts.maxPages ?? 100 : Math.min(opts.incrementalPages ?? 1, opts.maxPages ?? 100)
  let page = 1
  let pagesRead = 0
  let order = 0
  for (; page <= maxPages; page++) {
    const res = await fetchLabelTracksPage(page)
    pagesRead++
    log(`tracks page ${page}: ${res.results.length} tracks (label total ${res.count})`)
    res.results.forEach((t) => b.addTrack(t, order++))
    if (!res.hasNext || !res.results.length) break
    await sleep(delay)
  }

  // 2) pre-orders (future releases, not always in the tracks listing yet)
  try {
    const pre = await fetchLabelPreorders()
    pre.forEach((r) => b.addRelease(r))
    log(`pre-orders: ${pre.length}`)
  } catch (e) {
    errors.push(`preorders: ${String(e)}`)
  }

  // 3) release pages for catalogue number, UPC, release artists and track order
  const toFetch = b.releaseIds().filter((id) => opts.mode === 'full' || !known.has(id))
  let releasePagesRead = 0
  for (const id of toFetch) {
    await sleep(delay)
    try {
      const { release, tracks } = await fetchReleasePage(b.releaseSlug(id), id)
      releasePagesRead++
      if (release) b.addRelease(release)
      tracks.forEach((t, i) => b.addTrack(t, i))
      if (releasePagesRead % 25 === 0) log(`release pages: ${releasePagesRead}/${toFetch.length}`)
    } catch (e) {
      errors.push(`release ${id}: ${String(e)}`)
    }
  }

  const full = b.build()
  const newIds = full.releases.map((r) => r.id).filter((id) => !known.has(id))

  // incremental: only return what is new (existing releases are left untouched)
  const catalog: Catalog =
    opts.mode === 'full'
      ? full
      : {
          ...full,
          releases: full.releases.filter((r) => !known.has(r.id)),
          tracks: full.tracks.filter((t) => !known.has(t.releaseId)),
        }

  log(`done: ${catalog.releases.length} releases, ${catalog.tracks.length} tracks, ${catalog.artists.length} artists`)
  return { catalog, newReleaseIds: newIds, pagesRead, releasePagesRead, errors }
}
