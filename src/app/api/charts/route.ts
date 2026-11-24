import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Preview charts lived in Supabase. The public page no longer shows them. */
export async function GET() {
  return NextResponse.json({ artists: [], tracks: [] }, { headers: { 'Cache-Control': 'no-store' } })
}
