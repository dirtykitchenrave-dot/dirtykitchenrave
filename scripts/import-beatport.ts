/**
 * Beatport importer CLI.
 *
 *   npm run import:beatport                     # full import -> data/catalog.seed.json (no DB needed)
 *   npm run import:beatport -- --supabase       # full import -> Supabase (needs service role key)
 *   npm run import:beatport -- --incremental    # only new releases (+ pre-orders)
 *   npm run import:beatport -- --max-pages=1    # quick test: first 150 tracks only
 *   npm run import:beatport -- --dry-run        # scrape and print a summary, write nothing
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (only for --supabase)
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { mergeEditorial } from '../src/lib/beatport/build'
import { knownReleaseIds, serviceClient, writeCatalogToSupabase } from '../src/lib/beatport/sinks'
import { scrapeBeatport } from '../src/lib/beatport/sync'
import type { Catalog } from '../src/lib/types'

const ROOT = resolve(__dirname, '..')
const JSON_PATH = resolve(ROOT, 'data', 'catalog.seed.json')

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

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`))
  if (!hit) return undefined
  return hit.includes('=') ? hit.split('=').slice(1).join('=') : 'true'
}

async function main() {
  loadEnv()
  const toSupabase = Boolean(arg('supabase'))
  const dryRun = Boolean(arg('dry-run'))
  const mode = arg('incremental') ? 'incremental' : 'full'
  const maxPages = arg('max-pages') ? Number(arg('max-pages')) : undefined
  const log = (m: string) => console.log(`[beatport] ${m}`)

  let previous: Catalog | null = null
  if (existsSync(JSON_PATH)) {
    try {
      previous = JSON.parse(readFileSync(JSON_PATH, 'utf8')) as Catalog
    } catch {
      previous = null
    }
  }

  const sb = toSupabase ? serviceClient() : null
  let known = new Set<number>()
  if (mode === 'incremental') {
    known = sb ? await knownReleaseIds(sb) : new Set((previous?.releases || []).filter((r) => r.id > 0).map((r) => r.id))
    log(`known releases: ${known.size}`)
  }

  log(`mode=${mode} target=${dryRun ? 'dry-run' : toSupabase ? 'supabase' : 'json'}`)
  const res = await scrapeBeatport({ mode, knownReleaseIds: known, maxPages, log })
  if (res.errors.length) {
    console.warn(`[beatport] ${res.errors.length} errors:`)
    res.errors.slice(0, 20).forEach((e) => console.warn('  -', e))
  }
  log(`new releases: ${res.newReleaseIds.length}`)

  if (dryRun) {
    const sample = res.catalog.releases.slice(0, 5).map((r) => `${r.catalog || '—'}  ${r.releaseDate}  ${r.title}`)
    console.log(sample.join('\n'))
    return
  }

  if (sb) {
    await writeCatalogToSupabase(sb, res.catalog, log)
    log('Supabase updated')
    return
  }

  // JSON target: full replaces the file (keeping editorial fields); incremental merges into it
  let out: Catalog
  if (mode === 'full' || !previous) {
    out = mergeEditorial(res.catalog, previous)
  } else {
    const ids = new Set(res.catalog.releases.map((r) => r.id))
    const artistIds = new Set(res.catalog.artists.map((a) => a.id))
    out = {
      updatedAt: res.catalog.updatedAt,
      releases: [...res.catalog.releases, ...previous.releases.filter((r) => !ids.has(r.id))],
      tracks: [...res.catalog.tracks, ...previous.tracks.filter((t) => !ids.has(t.releaseId))],
      artists: [...previous.artists.filter((a) => !artistIds.has(a.id)), ...mergeEditorial(res.catalog, previous).artists],
    }
  }
  writeFileSync(JSON_PATH, JSON.stringify(out, null, 2) + '\n', 'utf8')
  log(`written ${JSON_PATH} (${out.releases.length} releases, ${out.tracks.length} tracks, ${out.artists.length} artists)`)
}

main().catch((e) => {
  console.error('[beatport] FAILED:', e)
  process.exit(1)
})
