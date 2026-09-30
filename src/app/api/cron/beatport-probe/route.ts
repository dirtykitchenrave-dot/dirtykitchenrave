import { NextResponse, type NextRequest } from 'next/server'
import { BEATPORT, LABEL_ID, LABEL_SLUG, extractNextData, queries } from '@/lib/beatport/scrape'

/**
 * Diagnostic: can THIS server reach Beatport, or does Cloudflare block it (403 "Just a moment…")?
 * Makes the same requests as the daily sync, writes nothing.
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/beatport-probe
 *
 * Read the result:
 *   verdict "ok"          -> the daily cron will work from this host.
 *   verdict "cloudflare"  -> blocked: see docs/BITACORA.md (Beatport API / browser-based import).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

async function probe(url: string) {
  const t0 = Date.now()
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' },
      cache: 'no-store',
    })
    const html = await res.text()
    const nd = extractNextData(html)
    const qs = queries(nd)
    const withResults = qs.find((q) => Array.isArray(q.state?.data?.results))
    const title = html.match(/<title>([^<]*)<\/title>/i)?.[1]?.trim() || null
    return {
      url,
      status: res.status,
      ms: Date.now() - t0,
      server: res.headers.get('server'),
      cfRay: res.headers.get('cf-ray'),
      cfMitigated: res.headers.get('cf-mitigated'),
      title,
      challenge: /just a moment|cf-chl|challenge-platform/i.test(html),
      nextData: Boolean(nd),
      queryKeys: qs.map((q) => String(q.queryKey?.[0] ?? '').slice(0, 60)),
      results: withResults?.state?.data?.results?.length ?? 0,
      total: withResults?.state?.data?.count ?? null,
    }
  } catch (e) {
    return { url, error: String(e), ms: Date.now() - t0 }
  }
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const tracks = await probe(`${BEATPORT}/label/${LABEL_SLUG}/${LABEL_ID}/tracks?page=1&per_page=25`)
  const preorders = await probe(`${BEATPORT}/label/${LABEL_SLUG}/${LABEL_ID}/releases?page=1&per_page=25`)

  const blocked = [tracks, preorders].some(
    (p) => 'status' in p && (p.status === 403 || p.challenge || p.cfMitigated === 'challenge'),
  )
  const ok = 'results' in tracks && tracks.results > 0
  const verdict = ok ? 'ok' : blocked ? 'cloudflare' : 'unknown'

  return NextResponse.json({
    verdict,
    host: process.env.VERCEL ? `vercel (${process.env.VERCEL_REGION || 'region?'})` : 'local',
    checkedAt: new Date().toISOString(),
    tracks,
    preorders,
  })
}
