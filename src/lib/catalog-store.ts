/**
 * Catalogue and bookings live in the repo (data/*.json).
 * On Vercel a save commits the file through the GitHub API so the next deploy publishes it.
 * Without GITHUB_TOKEN (local), the same files are written on disk.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Catalog } from './types'

const CATALOG_PATH = 'data/catalog.seed.json'
const BOOKINGS_PATH = 'data/bookings.json'

function repo() {
  return process.env.GITHUB_REPO || 'dirtykitchenrave-dot/dirtykitchenrave'
}

function token() {
  return process.env.GITHUB_TOKEN || ''
}

function localPath(rel: string) {
  return resolve(process.cwd(), rel)
}

async function githubMeta(rel: string): Promise<{ sha?: string; text: string | null }> {
  const key = token()
  if (!key) return { text: null }
  const url = `https://api.github.com/repos/${repo()}/contents/${rel}`
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${key}`,
    'User-Agent': 'dirtykitchenrave-admin',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  const metaRes = await fetch(`${url}?ref=main`, { headers })
  if (metaRes.status === 404) return { text: '' }
  if (!metaRes.ok) throw new Error(`GitHub ${rel}: ${metaRes.status}`)
  const meta = (await metaRes.json()) as { sha?: string; content?: string; encoding?: string; download_url?: string }
  if (meta.content && meta.encoding === 'base64') {
    return { sha: meta.sha, text: Buffer.from(meta.content.replace(/\n/g, ''), 'base64').toString('utf8') }
  }
  const raw = await fetch(meta.download_url || url, {
    headers: { ...headers, Accept: 'application/vnd.github.raw' },
  })
  if (!raw.ok) throw new Error(`GitHub raw ${rel}: ${raw.status}`)
  return { sha: meta.sha, text: await raw.text() }
}

async function githubPut(rel: string, text: string, message: string, sha?: string) {
  const key = token()
  const res = await fetch(`https://api.github.com/repos/${repo()}/contents/${rel}`, {
    method: 'PUT',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${key}`,
      'User-Agent': 'dirtykitchenrave-admin',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      content: Buffer.from(text, 'utf8').toString('base64'),
      sha,
      branch: 'main',
    }),
  })
  if (!res.ok) {
    const detail = await res.text()
    throw new Error(`GitHub write ${rel}: ${res.status} ${detail.slice(0, 200)}`)
  }
}

function readLocal(rel: string): string | null {
  try {
    return readFileSync(localPath(rel), 'utf8')
  } catch {
    return null
  }
}

async function readText(rel: string): Promise<string | null> {
  if (token()) {
    const remote = await githubMeta(rel)
    return remote.text
  }
  return readLocal(rel)
}

async function writeText(rel: string, text: string, message: string) {
  if (token()) {
    const remote = await githubMeta(rel)
    await githubPut(rel, text, message, remote.sha)
    return
  }
  if (process.env.VERCEL) throw new Error('GITHUB_TOKEN is not set')
  writeFileSync(localPath(rel), text, 'utf8')
}

export async function readCatalogFile(): Promise<Catalog> {
  const text = await readText(CATALOG_PATH)
  if (!text) throw new Error('Catalogue file is missing')
  return JSON.parse(text) as Catalog
}

export async function writeCatalogFile(catalog: Catalog, message: string) {
  catalog.updatedAt = new Date().toISOString()
  await writeText(CATALOG_PATH, JSON.stringify(catalog, null, 2) + '\n', message)
}

export async function readBookingsFile<T>(): Promise<T[]> {
  const text = await readText(BOOKINGS_PATH)
  if (!text) return []
  const parsed = JSON.parse(text) as T[]
  return Array.isArray(parsed) ? parsed : []
}

export async function writeBookingsFile(rows: unknown[], message: string) {
  await writeText(BOOKINGS_PATH, JSON.stringify(rows, null, 2) + '\n', message)
}
