import { revalidatePath } from 'next/cache'
import { NextResponse, type NextRequest } from 'next/server'
import { knownReleaseIds, serviceClient, writeCatalogToSupabase } from '@/lib/beatport/sinks'
import { scrapeBeatport } from '@/lib/beatport/sync'

/**
 * Daily incremental sync (Vercel Cron, see vercel.json).
 * Reads the newest Beatport tracks + pre-orders, stores new releases in Supabase and refreshes the site.
 * Protected with CRON_SECRET: Vercel sends "Authorization: Bearer <CRON_SECRET>" automatically.
 * Manual run: curl -H "Authorization: Bearer $CRON_SECRET" https://<site>/api/cron/beatport-sync
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const logs: string[] = []
  try {
    const sb = serviceClient()
    const known = await knownReleaseIds(sb)
    const res = await scrapeBeatport({
      mode: 'incremental',
      knownReleaseIds: known,
      incrementalPages: Number(req.nextUrl.searchParams.get('pages') || 1),
      delayMs: 700,
      log: (m) => logs.push(m),
    })
    if (res.catalog.releases.length || res.catalog.artists.length) {
      await writeCatalogToSupabase(sb, res.catalog, (m) => logs.push(m))
    }
    revalidatePath('/', 'layout')
    return NextResponse.json({
      ok: true,
      newReleases: res.newReleaseIds.length,
      pagesRead: res.pagesRead,
      releasePagesRead: res.releasePagesRead,
      errors: res.errors,
      logs,
    })
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e), logs }, { status: 500 })
  }
}
