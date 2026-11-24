import { NextResponse } from 'next/server'
import { loadPlayedChart } from '@/lib/plays'

export const runtime = 'nodejs'
export const revalidate = 604800

const WEEK = 'public, s-maxage=604800, stale-while-revalidate=86400'

/** Top 10. Cached a week so the public site does not read GitHub on every visit. */
export async function GET() {
  try {
    const chart = await loadPlayedChart(10)
    return NextResponse.json({ artists: chart.artists, tracks: chart.tracks }, { headers: { 'Cache-Control': WEEK } })
  } catch (err) {
    console.error('charts', err instanceof Error ? err.message : err)
    return NextResponse.json({ artists: [], tracks: [] }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
