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
  track: (isrc: string | null, title: string, artists: string[]) => Promise<string | null>
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
  const res = await fetch(url, { headers })
  if (res.status === 429) throw new Error('RATE_LIMIT')
  if (!res.ok) return null
  return res.json() as Promise<Record<string, unknown>>
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
    async track(isrc, title, artists) {
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

async function tidal(): Promise<Service> {
  const id = process.env.TIDAL_CLIENT_ID
  const secret = process.env.TIDAL_CLIENT_SECRET
  if (!id || !secret) throw new Error('Missing TIDAL_CLIENT_ID / TIDAL_CLIENT_SECRET')
  const token = await clientToken('https://auth.tidal.com/v1/oauth2/token', id, secret)
  const h = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.api+json' }
  const first = (j: Record<string, unknown> | null) => ((j?.data as { id: string }[]) || [])[0]?.id
  return {
    name: 'tidal',
    async track(isrc) {
      if (!isrc) return null // TIDAL: only exact ISRC matches
      const j = await getJson(`https://openapi.tidal.com/v2/tracks?countryCode=GB&filter%5Bisrc%5D=${encodeURIComponent(isrc)}`, h)
      const tid = first(j)
      return tid ? `https://tidal.com/browse/track/${tid}` : null
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
      const url = await svc.track(t.isrc, t.title, ids.map((i) => names.get(i) || '').filter(Boolean))
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
      if (done % 50 === 0) console.log(`[${svcName}] ${done} tracks, ${matched} matched`)
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
