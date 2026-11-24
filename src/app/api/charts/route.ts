import { NextResponse } from 'next/server'
import { loadPlayedChart } from '@/lib/plays'

export const runtime = 'nodejs'
export const revalidate = 86400

const DAY = 'public, s-maxage=86400, stale-while-revalidate=86400'

/** Top 10 from the morning snapshot. A new deploy replaces the file. */
export async function GET() {
  try {
    const chart = await loadPlayedChart(10)
    return NextResponse.json({ artists: chart.artists, tracks: chart.tracks }, { headers: { 'Cache-Control': DAY } })
  } catch (err) {
    console.error('charts', err instanceof Error ? err.message : err)
    return NextResponse.json({ artists: [], tracks: [] }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
