import { NextResponse } from 'next/server'
import { loadPlayedChart } from '@/lib/plays'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Top 10 by preview starts, read from data/plays.json. */
export async function GET() {
  try {
    const chart = await loadPlayedChart(10)
    return NextResponse.json(
      { artists: chart.artists, tracks: chart.tracks },
      { headers: { 'Cache-Control': 'no-store' } },
    )
  } catch (err) {
    console.error('charts', err instanceof Error ? err.message : err)
    return NextResponse.json({ artists: [], tracks: [] }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
