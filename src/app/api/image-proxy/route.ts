import { NextRequest, NextResponse } from 'next/server'

/**
 * Beatport artwork under our own domain, for the «Create video» canvas
 * (`src/components/VideoMaker.tsx`). A cross-origin image without CORS taints
 * the canvas and the browser then refuses to encode it. Only Beatport hosts.
 */
const ALLOWED_HOSTS = ['geo-media.beatport.com']
const MAX_IMAGE_BYTES = 6 * 1024 * 1024

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url')
  if (!raw) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        // JPEG/PNG only: Beatport negotiates WebP from Accept otherwise.
        Accept: 'image/jpeg,image/png;q=0.9,*/*;q=0.5',
      },
      next: { revalidate: 86400 },
    })
    if (!upstream.ok) return new NextResponse(null, { status: 502 })
    const type = upstream.headers.get('content-type') || 'image/jpeg'
    if (!/^image\//i.test(type)) return NextResponse.json({ error: 'Upstream is not an image' }, { status: 502 })
    const buf = await upstream.arrayBuffer()
    if (buf.byteLength > MAX_IMAGE_BYTES) return NextResponse.json({ error: 'Image too large' }, { status: 413 })
    return new NextResponse(buf, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    })
  } catch {
    return new NextResponse(null, { status: 502 })
  }
}
