import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Flash } from '@/components/admin/Bits'
import { saveRelease } from '@/lib/admin-actions'
import { formatDay, getRelease, tidalColumn } from '@/lib/admin-data'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const release = await getRelease(Number(id))
  return { title: release?.title || 'Release' }
}

export default async function ReleaseEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const { id } = await params
  const n = Number(id)
  if (!Number.isSafeInteger(n) || n <= 0) notFound()
  const release = await getRelease(n)
  if (!release) notFound()
  const sp = await searchParams
  const tidal = await tidalColumn()
  const when = formatDay(String(release.release_date).slice(0, 10))

  return (
    <div className="adm-wrap adm-narrow">
      <p className="adm-back">
        <Link href="/administrator/releases">← Releases</Link>
      </p>
      <header className="adm-head">
        <div>
          <h1>{release.title}</h1>
          <p>
            {release.catalog_number || release.type} · {when}
            {release.beatport_url ? (
              <>
                {' '}
                · <a href={release.beatport_url}>Beatport</a>
              </>
            ) : null}{' '}
            · <Link href={`/en/releases/${release.slug}`}>View on site</Link>
          </p>
        </div>
      </header>
      <Flash saved={sp.saved} error={sp.error} catalog />
      <form className="adm-form adm-panel" action={saveRelease}>
        <input type="hidden" name="id" value={release.id} />
        <label className="adm-check">
          <input type="checkbox" name="is_featured" defaultChecked={release.is_featured} />
          Pin to the home hero. Only one can be pinned: saving this one clears the previous.
        </label>
        <label>
          Note (Spanish)
          <textarea name="note_es" rows={6} maxLength={8000} defaultValue={release.note_es || ''} />
        </label>
        <label>
          Note (English)
          <textarea name="note_en" rows={6} maxLength={8000} defaultValue={release.note_en || ''} />
        </label>
        <div className="adm-grid">
          <label>
            Bandcamp
            <input name="bandcamp_url" defaultValue={release.bandcamp_url || ''} maxLength={400} />
          </label>
          <label>
            Spotify
            <input name="spotify_url" defaultValue={release.spotify_url || ''} maxLength={400} />
          </label>
          {tidal ? (
            <label>
              TIDAL
              <input name="tidal_url" defaultValue={release.tidal_url || ''} maxLength={400} />
            </label>
          ) : null}
          <label>
            Apple Music
            <input name="apple_music_url" defaultValue={release.apple_music_url || ''} maxLength={400} />
          </label>
        </div>
        <button className="adm-btn" type="submit">
          Save
        </button>
      </form>
    </div>
  )
}
