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
import { closeBeatportBrowser } from '../src/lib/beatport/scrape'
import { knownReleaseIds, serviceClient, writeCatalogToSupabase } from '../src/lib/beatport/sinks'
import { scrapeBeatport } from '../src/lib/beatport/sync'
import type { Catalog } from '../src/lib/types'

const ROOT = resolve(__dirname, '..')
const JSON_PATH = resolve(ROOT, 'data', 'catalog.seed.json')
const PLAYS_PUBLIC = resolve(ROOT, 'data', 'plays.public.json')

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

/** Copies data/plays.json from the plays branch into the file the public site ships. */
async function publishPlaysSnapshot() {
  const gh = process.env.GITHUB_TOKEN
  if (!gh) {
    console.log('[beatport] no GITHUB_TOKEN; plays snapshot skipped')
    return
  }
  const repo = process.env.GITHUB_REPO || 'dirtykitchenrave-dot/dirtykitchenrave'
  const res = await fetch(`https://api.github.com/repos/${repo}/contents/data/plays.json?ref=plays`, {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${gh}`,
      'User-Agent': 'dirtykitchenrave-daily',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  })
  let text = '{"events":[]}\n'
  if (res.status !== 404) {
    if (!res.ok) throw new Error(`plays branch: ${res.status}`)
    const meta = (await res.json()) as { content?: string }
    text = Buffer.from((meta.content || '').replace(/\n/g, ''), 'base64').toString('utf8')
    if (!text.endsWith('\n')) text += '\n'
  }
  const prev = existsSync(PLAYS_PUBLIC) ? readFileSync(PLAYS_PUBLIC, 'utf8') : ''
  if (prev === text) {
    console.log('[beatport] plays snapshot unchanged')
    return
  }
  writeFileSync(PLAYS_PUBLIC, text, 'utf8')
  console.log('[beatport] plays snapshot written')
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
  let res: Awaited<ReturnType<typeof scrapeBeatport>> | null = null
  try {
    res = await scrapeBeatport({ mode, knownReleaseIds: known, maxPages, log })
  } catch (e) {
    console.error('[beatport] scrape failed:', e)
  } finally {
    await closeBeatportBrowser()
  }
  if (!res) {
    if (arg('publish-plays')) await publishPlaysSnapshot()
    return
  }
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

  if (arg('publish-plays')) await publishPlaysSnapshot()

  // Incremental with nothing new must not rewrite the file: a new updatedAt would deploy an empty day.
  if (mode === 'incremental' && res.newReleaseIds.length === 0) {
    log('no new releases; catalog file left as it is')
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

main()
  .catch(async (e) => {
    await closeBeatportBrowser()
    console.error('[beatport] FAILED:', e)
    process.exit(1)
  })
