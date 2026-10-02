import { NextResponse } from 'next/server'
import { loadPlayedChart } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Fresh top 10. The about page asks for this on each visit, like Optimal Breaks /top100. */
export async function GET() {
  try {
    const chart = await loadPlayedChart(10)
    return NextResponse.json(chart, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ artists: [], tracks: [] }, { status: 500, headers: { 'Cache-Control': 'no-store' } })
  }
}
