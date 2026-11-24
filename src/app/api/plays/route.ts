import { NextRequest, NextResponse } from 'next/server'
import { knownTrack, recordPlay } from '@/lib/plays'

export const runtime = 'nodejs'

/** Records one preview start in data/plays.json. */
export async function POST(request: NextRequest) {
  let trackId = NaN
  try {
    const body = await request.json()
    trackId = Number(body?.trackId)
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (!Number.isSafeInteger(trackId) || trackId <= 0 || !knownTrack(trackId)) {
    return new NextResponse(null, { status: 204 })
  }
  try {
    const saved = await recordPlay(trackId)
    if (!saved) return NextResponse.json({ error: 'Unavailable' }, { status: 503 })
  } catch (err) {
    console.error('play', err instanceof Error ? err.message : err)
    return NextResponse.json({ error: 'Unavailable' }, { status: 503 })
  }
  return new NextResponse(null, { status: 204 })
}
