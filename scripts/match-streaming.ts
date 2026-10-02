/**
 * Spotify / TIDAL matching for DKR tracks and releases (same idea as Optimal Breaks
 * scripts/spotify-match-charts.mjs, but by ISRC / UPC, which Beatport gives us: exact matches).
 *
 *   npm run match:streaming                         # Spotify, JSON file (data/catalog.seed.json)
 *   npm run match:streaming -- --service=tidal      # TIDAL
 *   npm run match:streaming -- --supabase           # read/write Supabase instead of the JSON file
 *   npm run match:streaming -- --force              # re-match rows that already have a link
 *   npm run match:streaming -- --limit=100 --dry-run
 *
 * Env (.env.local):
 *   SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET   (developer.spotify.com, client credentials)
 *   TIDAL_CLIENT_ID + TIDAL_CLIENT_SECRET       (developer.tidal.com, client credentials)
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (only with --supabase)
 *
 * Rule (conservative, like Optimal Breaks): better no link than a wrong one.
 *  - Track with ISRC  -> exact ISRC lookup.
 *  - TIDAL without an ISRC hit -> same search as Optimal (artist + title, then title).
 *    The title must match and one of our artists must be credited.
 *  - Track without ISRC (Spotify only) -> search; the title must match and one of our artists must be credited.
 *  - Release with UPC -> exact album lookup.
 * Corporate networks with SSL inspection: run with NODE_OPTIONS=--use-system-ca
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createClient } from '@supabase/supabase-js'
import type { Catalog } from '../src/lib/types'

const ROOT = resolve(__dirname, '..')
const JSON_PATH = resolve(ROOT, 'data', 'catalog.seed.json')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function loadEnv() {
  for (const f of ['.env', '.env.local']) {
    const p = resolve(ROOT, f)
    if (!existsSync(p)) continue
    for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!m || line.trim().startsWith('#')) continue
      const v = m[2].replace(/^['"]|['"]$/g, '')
      if (process.env[m[1]] === undefined && v !== '') process.env[m[1]] = v
    }
  }
}
const arg = (n: string) => {
  const hit = process.argv.find((a) => a === `--${n}` || a.startsWith(`--${n}=`))
  return hit ? (hit.includes('=') ? hit.split('=').slice(1).join('=') : 'true') : undefined
}
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()

/* ------------------------------------------------------------------ services */

interface Service {
  name: 'spotify' | 'tidal'
  track: (isrc: string | null, title: string, artists: string[], mix: string) => Promise<string | null>
  album: (upc: string) => Promise<string | null>
}

async function clientToken(url: string, id: string, secret: string): Promise<string> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`token ${res.status}: ${await res.text()}`)
  return ((await res.json()) as { access_token: string }).access_token
}

async function getJson(url: string, headers: Record<string, string>) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(url, { headers })
    if (res.status === 429) {
      const retry = Number(res.headers.get('retry-after') || '2')
      const body = await res.text().catch(() => '')
      if (retry > 600 || body.includes('QUOTA_EXCEEDED')) throw new Error('RATE_LIMIT')
      console.warn(`  … rate limit, waiting ${retry}s`)
      await sleep((retry + 1) * 1000)
      continue
    }
    if (res.status >= 500 && res.status <= 599) {
      await sleep(2000)
      continue
    }
    if (!res.ok) return null
    return res.json() as Promise<Record<string, unknown>>
  }
  throw new Error('RATE_LIMIT')
}

async function spotify(): Promise<Service> {
  const id = process.env.SPOTIFY_CLIENT_ID
  const secret = process.env.SPOTIFY_CLIENT_SECRET
  if (!id || !secret) throw new Error('Missing SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET')
  const token = await clientToken('https://accounts.spotify.com/api/token', id, secret)
  const h = { Authorization: `Bearer ${token}` }
  type SpTrack = { name: string; artists: { name: string }[]; external_urls: { spotify: string } }
  return {
    name: 'spotify',
    async track(isrc, title, artists, _mix) {
      const q = isrc ? `isrc:${isrc}` : `track:"${title}" ${artists[0] ? `artist:"${artists[0]}"` : ''}`
      const j = await getJson(`https://api.spotify.com/v1/search?type=track&limit=10&q=${encodeURIComponent(q)}`, h)
      const items = ((j?.tracks as { items?: SpTrack[] })?.items || []) as SpTrack[]
      const ours = artists.map(norm)
      const ok = items.find((it) => {
        if (isrc) return true // exact code match
        const titleOk = norm(it.name) === norm(title) || norm(it.name).includes(norm(title))
        const artistOk = it.artists.some((a) => ours.includes(norm(a.name)))
        return titleOk && artistOk
      })
      return ok?.external_urls?.spotify || null
    },
    async album(upc) {
      const j = await getJson(`https://api.spotify.com/v1/search?type=album&limit=1&q=${encodeURIComponent(`upc:${upc}`)}`, h)
      const it = ((j?.albums as { items?: { external_urls: { spotify: string } }[] })?.items || [])[0]
      return it?.external_urls?.spotify || null
    },
  }
}

/** Same scoring as Optimal Breaks scripts/spotify-match-charts.mjs. Below 4, no link. */
function scoreTidal(title: string, mix: string, artists: string[], cand: { name: string; artists: string[] }): number {
  const ourTitle = norm(title)
  const ourMix = norm(mix)
  const mixEmpty = !ourMix || ourMix === 'original mix' || ourMix === 'original'
  const candName = norm(cand.name)
  const candBase = norm(String(cand.name).split(/\s+[-–—]\s+/)[0] || '')
  const titleExact = candName === ourTitle || candBase === ourTitle
  const titleContained = !titleExact && (candName.includes(ourTitle) || ourTitle.includes(candBase))
  if (!titleExact && !titleContained) return 0
  const matched = artists.filter((n) => {
    const our = norm(n)
    if (!our) return false
    return cand.artists.some((c) => {
      const cn = norm(c)
      return cn === our || cn.includes(our) || our.includes(cn)
    })
  }).length
  if (matched === 0) return 0
  let score = (titleExact ? 4 : 2) + matched * 2
  if (!mixEmpty) {
    if (candName.includes(ourMix)) score += 3
    else score -= 1
  } else if (candName !== ourTitle && candBase === ourTitle && candName.length > ourTitle.length) {
    score -= 2
  }
  return score
}

async function tidal(): Promise<Service> {
  const id = process.env.TIDAL_CLIENT_ID
  const secret = process.env.TIDAL_CLIENT_SECRET
  if (!id || !secret) throw new Error('Missing TIDAL_CLIENT_ID / TIDAL_CLIENT_SECRET')
  const token = await clientToken('https://auth.tidal.com/v1/oauth2/token', id, secret)
  const h = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.api+json' }
  const first = (j: Record<string, unknown> | null) => ((j?.data as { id: string }[]) || [])[0]?.id
  type Cand = { name: string; artists: string[]; url: string }
  async function search(query: string): Promise<Cand[]> {
    const j = await getJson(
      `https://openapi.tidal.com/v2/searchResults?countryCode=GB&include=tracks.artists&filter%5Bquery%5D=${encodeURIComponent(query)}`,
      h,
    )
    const included = (j?.included as { type?: string; id?: string; attributes?: Record<string, unknown>; relationships?: { artists?: { data?: { id: string }[] } } }[]) || []
    const artistById = new Map(
      included.filter((r) => r.type === 'artists').map((a) => [a.id || '', String(a.attributes?.name || '')]),
    )
    return included
      .filter((r) => r.type === 'tracks')
      .map((t) => {
        const title = String(t.attributes?.title || '')
        const version = String(t.attributes?.version || '').trim()
        const name = version && !title.toLowerCase().includes(version.toLowerCase()) ? `${title} (${version})` : title
        const links = t.attributes?.externalLinks as { href?: string }[] | undefined
        return {
          name,
          artists: (t.relationships?.artists?.data || []).map((r) => artistById.get(r.id) || '').filter(Boolean),
          url: links?.[0]?.href || (t.id ? `https://tidal.com/browse/track/${t.id}` : ''),
        }
      })
      .filter((c) => c.url)
  }
  function best(title: string, mix: string, artists: string[], cands: Cand[]): string | null {
    let url: string | null = null
    let bestScore = 0
    for (const cand of cands) {
      const s = scoreTidal(title, mix, artists, cand)
      if (s > bestScore) {
        url = cand.url
        bestScore = s
      }
    }
    return bestScore >= 4 ? url : null
  }
  const seen = new Map<string, string | null>()
  return {
    name: 'tidal',
    async track(isrc, title, artists, mix) {
      const cacheKey = `${isrc || ''}|${norm(title)}|${norm(mix)}|${norm(artists[0] || '')}`
      if (seen.has(cacheKey)) return seen.get(cacheKey) || null
      const remember = (url: string | null) => {
        seen.set(cacheKey, url)
        return url
      }
      if (isrc) {
        const j = await getJson(`https://openapi.tidal.com/v2/tracks?countryCode=GB&filter%5Bisrc%5D=${encodeURIComponent(isrc)}`, h)
        const tid = first(j)
        if (tid) return remember(`https://tidal.com/browse/track/${tid}`)
      }
      const cleanTitle = title.replace(/"/g, '')
      const firstArtist = (artists[0] || '').replace(/"/g, '')
      const queries = [`${firstArtist} ${cleanTitle}`.trim(), cleanTitle]
      let hit = best(title, mix, artists, await search(queries[0]))
      if (!hit && queries[1] && queries[1] !== queries[0]) {
        await sleep(120)
        hit = best(title, mix, artists, await search(queries[1]))
      }
      return remember(hit)
    },
    async album(upc) {
      const j = await getJson(`https://openapi.tidal.com/v2/albums?countryCode=GB&filter%5BbarcodeId%5D=${encodeURIComponent(upc)}`, h)
      const aid = first(j)
      return aid ? `https://tidal.com/browse/album/${aid}` : null
    },
  }
}

/* ------------------------------------------------------------------ main */

async function main() {
  loadEnv()
  const svcName = arg('service') === 'tidal' ? 'tidal' : 'spotify'
  const force = Boolean(arg('force'))
  const dry = Boolean(arg('dry-run'))
  const limit = arg('limit') ? Number(arg('limit')) : Infinity
  const useDb = Boolean(arg('supabase'))
  const svc = svcName === 'tidal' ? await tidal() : await spotify()
  const trackField = svcName === 'tidal' ? 'tidalUrl' : 'spotifyUrl'
  const relField = svcName === 'tidal' ? 'tidal' : 'spotify'

  // load catalogue
  let catalog: Catalog
  const sb = useDb
    ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    : null
  if (sb) {
    const { loadCatalogFromSupabase } = await import('../src/lib/supabase')
    catalog = await loadCatalogFromSupabase()
  } else {
    catalog = JSON.parse(readFileSync(JSON_PATH, 'utf8')) as Catalog
  }
  const names = new Map(catalog.artists.map((a) => [a.id, a.name]))
  const relById = new Map(catalog.releases.map((r) => [r.id, r]))

  let matched = 0
  let missed = 0
  let done = 0
  const misses: string[] = []

  try {
    // tracks
    for (const t of catalog.tracks) {
      if (done >= limit) break
      if (t.id < 0) continue
      if (!force && t[trackField]) continue
      const rel = relById.get(t.releaseId)
      const ids = t.artistIds.length ? t.artistIds : rel?.artistIds || []
      const url = await svc.track(t.isrc, t.title, ids.map((i) => names.get(i) || '').filter(Boolean), t.mix || '')
      done++
      if (url) {
        matched++
        t[trackField] = url
        if (sb && !dry) {
          const col = svcName === 'tidal' ? 'tidal_url' : 'spotify_url'
          await sb.from('tracks').update({ [col]: url }).eq('id', t.id)
        }
      } else {
        missed++
        misses.push(`${t.title} (${t.mix}) ${t.isrc || 'no ISRC'}`)
      }
      if (done % 50 === 0) {
        console.log(`[${svcName}] ${done} tracks, ${matched} matched`)
        if (!sb && !dry) writeFileSync(JSON_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8')
      }
      await sleep(120)
    }
    // releases (album links) by UPC
    for (const r of catalog.releases) {
      if (!r.upc || r.id < 0) continue
      if (!force && r.links[relField]) continue
      const url = await svc.album(r.upc)
      if (url) {
        r.links[relField] = url
        if (sb && !dry) {
          const col = svcName === 'tidal' ? 'tidal_url' : 'spotify_url'
          await sb.from('releases').update({ [col]: url }).eq('id', r.id)
        }
      }
      await sleep(120)
    }
  } catch (e) {
    if (String(e).includes('RATE_LIMIT')) console.warn(`[${svcName}] rate limit reached: saving progress, run again later.`)
    else throw e
  }

  if (!sb && !dry) writeFileSync(JSON_PATH, JSON.stringify(catalog, null, 2) + '\n', 'utf8')
  console.log(`[${svcName}] done: ${matched} matched, ${missed} without match${dry ? ' (dry run, nothing written)' : ''}`)
  if (misses.length) console.log(misses.slice(0, 25).map((m) => `  - ${m}`).join('\n'))
}

main().catch((e) => {
  console.error('[match] FAILED:', e)
  process.exit(1)
})
