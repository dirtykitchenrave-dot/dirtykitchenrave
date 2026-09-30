import { NextRequest, NextResponse } from 'next/server'
import { streamAudioUpstream } from '@/lib/audio-upstream'

/** Beatport preview passthrough (ported from Optimal Breaks). Only Beatport hosts are allowed. */
const ALLOWED_HOSTS = ['geo-samples.beatport.com', 'geo-media.beatport.com']

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) return NextResponse.json({ error: 'Missing url param' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }
  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json({ error: 'Host not allowed' }, { status: 403 })
  }

  return streamAudioUpstream(request, parsed.toString(), 'public, max-age=86400, s-maxage=86400')
}
