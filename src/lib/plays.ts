/**
 * Preview starts. One row per play, same idea as the old track_play_events table.
 * The file is data/plays.json. On this PC it is written on disk.
 * On Vercel the disk does not last, so the same file is committed on the branch `plays`,
 * which does not deploy the site. A play must not commit to main.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import seed from '../../data/catalog.seed.json'
import type { Catalog } from './types'

const FILE = 'data/plays.json'
const BRANCH = 'plays'

export interface PlayEvent {
  trackId: number
  at: string
}

export interface ChartArtist {
  id: number
  slug: string
  name: string
  plays: number
}

export interface ChartTrack {
  id: number
  releaseSlug: string
  title: string
  mix: string
  artistNames: string[]
  plays: number
}

function repo() {
  return process.env.GITHUB_REPO || 'dirtykitchenrave-dot/dirtykitchenrave'
}

function token() {
  return process.env.GITHUB_TOKEN || ''
}

function headers() {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token()}`,
    'User-Agent': 'dirtykitchenrave-plays',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

function localPath() {
  return resolve(process.cwd(), FILE)
}

function parseEvents(text: string | null | undefined): PlayEvent[] {
  if (!text) return []
  try {
    const parsed = JSON.parse(text) as { events?: PlayEvent[] } | PlayEvent[]
    const rows = Array.isArray(parsed) ? parsed : parsed.events || []
    return rows.filter((row) => Number.isSafeInteger(row.trackId) && row.trackId > 0 && typeof row.at === 'string')
  } catch {
    return []
  }
}

async function branchSha(name: string): Promise<string | null> {
  const res = await fetch(`https://api.github.com/repos/${repo()}/git/ref/heads/${name}`, { headers: headers() })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`GitHub ref ${name}: ${res.status}`)
  const body = (await res.json()) as { object?: { sha?: string } }
  return body.object?.sha || null
}

async function ensurePlaysBranch() {
  if (await branchSha(BRANCH)) return
  const main = await branchSha('main')
  if (!main) throw new Error('GitHub main branch is missing')
  const res = await fetch(`https://api.github.com/repos/${repo()}/git/refs`, {
    method: 'POST',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: main }),
  })
  if (!res.ok && res.status !== 422) throw new Error(`GitHub create ${BRANCH}: ${res.status}`)
}

async function remoteFile(): Promise<{ sha?: string; events: PlayEvent[] }> {
  await ensurePlaysBranch()
  const res = await fetch(`https://api.github.com/repos/${repo()}/contents/${FILE}?ref=${BRANCH}`, { headers: headers() })
  if (res.status === 404) return { events: [] }
  if (!res.ok) throw new Error(`GitHub plays: ${res.status}`)
  const meta = (await res.json()) as { sha?: string; content?: string; encoding?: string }
  const text =
    meta.content && meta.encoding === 'base64'
      ? Buffer.from(meta.content.replace(/\n/g, ''), 'base64').toString('utf8')
      : ''
  return { sha: meta.sha, events: parseEvents(text) }
}

async function remoteWrite(events: PlayEvent[], sha?: string) {
  const text = JSON.stringify({ events }, null, 2) + '\n'
  const res = await fetch(`https://api.github.com/repos/${repo()}/contents/${FILE}`, {
    method: 'PUT',
    headers: { ...headers(), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: 'Play',
      content: Buffer.from(text, 'utf8').toString('base64'),
      sha,
      branch: BRANCH,
    }),
  })
  if (res.status === 409 || res.status === 422) return false
  if (!res.ok) throw new Error(`GitHub play write: ${res.status}`)
  return true
}

function readLocal(): PlayEvent[] {
  try {
    return parseEvents(readFileSync(localPath(), 'utf8'))
  } catch {
    return []
  }
}

function writeLocal(events: PlayEvent[]) {
  writeFileSync(localPath(), JSON.stringify({ events }, null, 2) + '\n', 'utf8')
}

export function knownTrack(trackId: number) {
  return (seed as unknown as Catalog).tracks.some((track) => track.id === trackId)
}

export async function readPlays(): Promise<PlayEvent[]> {
  if (token()) return (await remoteFile()).events
  return readLocal()
}

/** Appends one preview start. Returns false when the file could not be saved. */
export async function recordPlay(trackId: number): Promise<boolean> {
  if (!knownTrack(trackId)) return true
  const event = { trackId, at: new Date().toISOString() }
  if (!token()) {
    if (process.env.VERCEL) return false
    const events = readLocal()
    events.push(event)
    writeLocal(events)
    return true
  }
  for (let attempt = 0; attempt < 3; attempt++) {
    const current = await remoteFile()
    const ok = await remoteWrite([...current.events, event], current.sha)
    if (ok) return true
  }
  return false
}

export async function loadPlayedChart(limit = 10): Promise<{
  artists: ChartArtist[]
  tracks: ChartTrack[]
  total: number
  month: number
}> {
  const catalog = seed as unknown as Catalog
  const events = await readPlays()
  const since = Date.now() - 30 * 24 * 60 * 60 * 1000
  const month = events.filter((event) => new Date(event.at).getTime() >= since).length
  const counts = new Map<number, number>()
  for (const event of events) counts.set(event.trackId, (counts.get(event.trackId) || 0) + 1)

  const tracksById = new Map(catalog.tracks.map((track) => [track.id, track]))
  const releasesById = new Map(catalog.releases.map((release) => [release.id, release]))
  const artistsById = new Map(catalog.artists.map((artist) => [artist.id, artist]))
  const artistPlays = new Map<number, number>()
  const tracks: ChartTrack[] = []

  for (const [id, plays] of counts) {
    const track = tracksById.get(id)
    if (!track) continue
    const release = releasesById.get(track.releaseId)
    const names = track.artistIds.map((artistId) => artistsById.get(artistId)?.name).filter((name): name is string => Boolean(name))
    if (release) {
      tracks.push({
        id: track.id,
        releaseSlug: release.slug,
        title: track.title.trim(),
        mix: (track.mix || '').trim(),
        artistNames: names,
        plays,
      })
    }
    const seen = new Set<number>()
    for (const artistId of [...track.artistIds, ...track.remixerIds]) {
      if (seen.has(artistId)) continue
      seen.add(artistId)
      if (!artistsById.has(artistId)) continue
      artistPlays.set(artistId, (artistPlays.get(artistId) || 0) + plays)
    }
  }

  return {
    total: events.length,
    month,
    artists: [...artistPlays.entries()]
      .flatMap(([id, plays]) => {
        const artist = artistsById.get(id)
        return artist ? [{ id: artist.id, slug: artist.slug, name: artist.name, plays }] : []
      })
      .sort((a, b) => b.plays - a.plays || a.name.localeCompare(b.name))
      .slice(0, limit),
    tracks: tracks.sort((a, b) => b.plays - a.plays || a.title.localeCompare(b.title)).slice(0, limit),
  }
}
