/**
 * Low-level Beatport scraping: fetch public HTML and read the server-rendered
 * `__NEXT_DATA__` (React Query dehydrated state). Same approach as Optimal Breaks.
 * Findings (Sept 2026) are documented in docs/IMPORTER.md.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Blob = Record<string, any>

export const BEATPORT = 'https://www.beatport.com'
export const LABEL_ID = 112835
export const LABEL_SLUG = 'dirty-kitchen-rave'

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

export async function fetchHtml(url: string, tries = 3): Promise<string> {
  let lastErr: unknown
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      })
      if (res.ok) return await res.text()
      if (res.status === 404) throw new Error(`Beatport 404: ${url}`)
      lastErr = new Error(`Beatport HTTP ${res.status}: ${url}`)
    } catch (e) {
      lastErr = e
      if (String(e).includes('404')) throw e
    }
    await sleep(1500 * (i + 1))
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr))
}

export function extractNextData(html: string): Blob | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

interface Query {
  queryKey?: unknown[]
  state?: { data?: Blob }
}

export function queries(nd: Blob | null): Query[] {
  return (nd?.props?.pageProps?.dehydratedState?.queries as Query[]) || []
}

const key0 = (q: Query) => String(q.queryKey?.[0] ?? '')

/* ------------------------------------------------------------------ pages */

/**
 * /label/<slug>/<id>/tracks?page=N&per_page=150
 * Server-renders the full track objects (sample_url, bpm, key, genre, artists, remixers, release…).
 * Sept 2026: 1,571 tracks -> 11 pages of 150.
 */
export async function fetchLabelTracksPage(
  page: number,
  perPage = 150,
): Promise<{ results: Blob[]; count: number; hasNext: boolean }> {
  const url = `${BEATPORT}/label/${LABEL_SLUG}/${LABEL_ID}/tracks?page=${page}&per_page=${perPage}`
  const nd = extractNextData(await fetchHtml(url))
  const q = queries(nd).find((x) => /^tracks/.test(key0(x)) && Array.isArray(x.state?.data?.results))
  const data = q?.state?.data || {}
  return {
    results: (data.results as Blob[]) || [],
    count: Number(data.count || 0),
    hasNext: Boolean(data.next),
  }
}

/**
 * /label/<slug>/<id>/releases
 * Only the PRE-ORDERS are server-rendered there (query key contains "preorder true").
 * The regular list is loaded client-side, so it is not used.
 */
export async function fetchLabelPreorders(): Promise<Blob[]> {
  const url = `${BEATPORT}/label/${LABEL_SLUG}/${LABEL_ID}/releases?page=1&per_page=150`
  const nd = extractNextData(await fetchHtml(url))
  const q = queries(nd).find((x) => /^releases/.test(key0(x)) && Array.isArray(x.state?.data?.results))
  return ((q?.state?.data?.results as Blob[]) || []).filter((r) => r?.label?.id === LABEL_ID || !r?.label)
}

/** /release/<slug>/<id>: release detail (catalog_number, upc, artists…) and its tracks in order. */
export async function fetchReleasePage(slug: string, id: number): Promise<{ release: Blob | null; tracks: Blob[] }> {
  const nd = extractNextData(await fetchHtml(`${BEATPORT}/release/${slug || 'release'}/${id}`))
  let release: Blob | null = null
  let tracks: Blob[] = []
  for (const q of queries(nd)) {
    const d = q.state?.data
    if (!d || typeof d !== 'object') continue
    if (!release && Number(d.id) === id && ('catalog_number' in d || 'upc' in d)) release = d
    const results = d.results as Blob[] | undefined
    if (
      Array.isArray(results) &&
      results.length &&
      results[0]?.sample_url !== undefined &&
      results.every((t) => Number(t?.release?.id) === id)
    ) {
      tracks = results
    }
  }
  return { release, tracks }
}
