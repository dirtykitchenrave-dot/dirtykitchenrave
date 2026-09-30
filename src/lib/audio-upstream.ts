// Remote audio passthrough with HTTP Range support (ported from Optimal Breaks).
// iOS Safari requests audio in chunks (`Range: bytes=0-1`, then more) and expects 206 + Content-Range.
// Without it, playback or seeking fails on iPhone.

import https from 'node:https'
import { Readable } from 'node:stream'
import { NextRequest, NextResponse } from 'next/server'

export const AUDIO_PROXY_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

/** Max time to receive the upstream HEADERS (connect + TTFB). The body then streams without limit. */
const UPSTREAM_TIMEOUT_MS = 10_000

/** Beatport samples are ~2–5 MB. */
const MAX_FULL_SIZE = 20 * 1024 * 1024

export async function streamAudioUpstream(
  request: NextRequest,
  upstreamUrl: string,
  cacheControl: string,
): Promise<NextResponse> {
  const range = request.headers.get('range')
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), UPSTREAM_TIMEOUT_MS)
  let upstream: Response
  try {
    upstream = await fetchUpstream(upstreamUrl, range, ctl.signal)
  } catch (err) {
    clearTimeout(timer)
    const aborted = ctl.signal.aborted || (err instanceof Error && err.name === 'AbortError')
    return NextResponse.json(
      { error: aborted ? 'Upstream timeout' : 'Upstream unreachable' },
      { status: aborted ? 504 : 502 },
    )
  }
  clearTimeout(timer)

  if (!upstream.ok && upstream.status !== 416) {
    return NextResponse.json({ error: `Upstream ${upstream.status}` }, { status: 502 })
  }

  const len = upstream.headers.get('content-length')
  if (upstream.status === 200 && len && Number.parseInt(len, 10) > MAX_FULL_SIZE) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const headers = new Headers({
    'Content-Type': upstream.headers.get('content-type') || 'audio/mpeg',
    'Accept-Ranges': 'bytes',
    'Cache-Control': cacheControl,
  })
  for (const h of ['content-length', 'content-range', 'etag', 'last-modified']) {
    const v = upstream.headers.get(h)
    if (v) headers.set(h, v)
  }

  return new NextResponse(upstream.status === 416 ? null : upstream.body, { status: upstream.status, headers })
}

function isLeafCertError(err: unknown): boolean {
  let cur: unknown = err
  for (let i = 0; i < 5 && cur; i++) {
    if (typeof cur === 'object' && cur !== null && 'code' in cur && (cur as { code?: string }).code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
      return true
    }
    if (cur instanceof Error && cur.message.includes('UNABLE_TO_VERIFY_LEAF_SIGNATURE')) return true
    cur = cur instanceof Error ? cur.cause : null
  }
  return false
}

/**
 * Skipping TLS verification is ONLY for local development behind a corporate proxy with SSL inspection
 * (Acttax). Never in production: on Vercel a certificate error must fail, not be bypassed.
 * `next dev` enables it automatically; `next start` on a local machine needs ALLOW_INSECURE_UPSTREAM_TLS=1.
 */
function allowInsecureTls(): boolean {
  if (process.env.VERCEL) return false
  return process.env.NODE_ENV === 'development' || process.env.ALLOW_INSECURE_UPSTREAM_TLS === '1'
}

let warnedInsecure = false

/** Normal fetch. Local dev on the Acttax proxy only: the leaf-cert failure retries without verifying TLS. */
async function fetchUpstream(upstreamUrl: string, range: string | null, signal: AbortSignal): Promise<Response> {
  const headers = { 'User-Agent': AUDIO_PROXY_UA, ...(range ? { Range: range } : {}) }
  try {
    return await fetch(upstreamUrl, { headers, signal, cache: 'no-store' })
  } catch (err) {
    if (signal.aborted || !isLeafCertError(err) || !allowInsecureTls()) throw err
    if (!warnedInsecure) {
      warnedInsecure = true
      console.warn('[audio-proxy] TLS verification skipped for Beatport samples (local development only).')
    }
    return fetchUpstreamRelaxed(upstreamUrl, headers, signal)
  }
}

function fetchUpstreamRelaxed(
  upstreamUrl: string,
  headers: Record<string, string>,
  signal: AbortSignal,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason instanceof Error ? signal.reason : new DOMException('Aborted', 'AbortError'))
      return
    }
    const req = https.request(upstreamUrl, { method: 'GET', headers, rejectUnauthorized: false }, (res) => {
      const bag = new Headers()
      const copy = (name: string) => {
        const value = res.headers[name]
        if (typeof value === 'string') bag.set(name, value)
      }
      copy('content-type')
      copy('content-length')
      copy('content-range')
      copy('etag')
      copy('last-modified')
      copy('accept-ranges')
      resolve(
        new Response(Readable.toWeb(res) as ReadableStream<Uint8Array>, {
          status: res.statusCode ?? 502,
          headers: bag,
        }),
      )
    })
    const onAbort = () => req.destroy()
    signal.addEventListener('abort', onAbort, { once: true })
    req.on('close', () => signal.removeEventListener('abort', onAbort))
    req.on('error', reject)
    req.end()
  })
}
