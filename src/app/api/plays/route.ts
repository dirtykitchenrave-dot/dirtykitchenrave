import { NextRequest, NextResponse } from 'next/server'
import { serviceClient } from '@/lib/beatport/sinks'

export const runtime = 'nodejs'

/** Records one preview start. The player calls this; the count is not shown on the site. */
export async function POST(request: NextRequest) {
  let trackId = NaN
  try {
    const body = await request.json()
    trackId = Number(body?.trackId)
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (!Number.isSafeInteger(trackId) || trackId <= 0) {
    return NextResponse.json({ error: 'Bad track' }, { status: 400 })
  }

  try {
    const sb = serviceClient()
    const { error } = await sb.from('track_play_events').insert({ track_id: trackId })
    if (error) {
      // Unknown track (foreign key). Don't tell the caller which ids exist.
      if (error.code === '23503') return new NextResponse(null, { status: 204 })
      return NextResponse.json({ error: 'Failed' }, { status: 500 })
    }
  } catch {
    return NextResponse.json({ error: 'Unavailable' }, { status: 503 })
  }

  return new NextResponse(null, { status: 204 })
}
