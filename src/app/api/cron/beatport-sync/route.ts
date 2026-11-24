import { NextResponse } from 'next/server'

/**
 * Retired 24 Nov 2026. The daily catalogue run is GitHub Actions
 * (.github/workflows/beatport-daily.yml). This path used to be the Vercel cron
 * and wrote Supabase. The project is gone, so the route does not call Beatport.
 */
export function GET() {
  return NextResponse.json(
    { ok: false, error: 'Beatport sync runs in GitHub Actions, not on Vercel.' },
    { status: 410 },
  )
}
