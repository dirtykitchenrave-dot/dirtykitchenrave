import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Flash } from '@/components/admin/Bits'
import { saveTrack } from '@/lib/admin-actions'
import { getTrack, tidalColumn } from '@/lib/admin-data'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const track = await getTrack(Number(id))
  return { title: track?.title || 'Tema' }
}

export default async function TrackEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const { id } = await params
  const n = Number(id)
  if (!Number.isSafeInteger(n) || n <= 0) notFound()
  const track = await getTrack(n)
  if (!track) notFound()
  const sp = await searchParams
  const tidal = await tidalColumn()
  const release = track.releases

  return (
    <div className="adm-wrap adm-narrow">
      <p className="adm-back">
        <Link href="/administrator/tracks">← Temas</Link>
      </p>
      <header className="adm-head">
        <div>
          <h1>
            {track.title}
            {track.mix_name ? ` (${track.mix_name})` : ''}
          </h1>
          <p>
            {release ? (
              <>
                {release.catalog_number || release.title} · <Link href={`/administrator/releases/${release.id}`}>{release.title}</Link>
                {' · '}
                <Link href={`/es/releases/${release.slug}`}>Ver en la web</Link>
              </>
            ) : (
              'Sin disco'
            )}
            {track.isrc ? ` · ${track.isrc}` : ''}
            {track.beatport_url ? (
              <>
                {' '}
                · <a href={track.beatport_url}>Beatport</a>
              </>
            ) : null}
          </p>
        </div>
      </header>
      <Flash saved={sp.saved} error={sp.error} catalog />
      <form className="adm-form adm-panel" action={saveTrack}>
        <input type="hidden" name="id" value={track.id} />
        <label>
          Spotify
          <input name="spotify_url" defaultValue={track.spotify_url || ''} maxLength={400} placeholder="https://open.spotify.com/track/…" />
        </label>
        {tidal ? (
          <label>
            TIDAL
            <input name="tidal_url" defaultValue={track.tidal_url || ''} maxLength={400} placeholder="https://tidal.com/browse/track/…" />
          </label>
        ) : (
          <p className="adm-hint">TIDAL sigue en el catálogo de la web. La columna todavía no está en la base, así que desde aquí solo se guarda Spotify.</p>
        )}
        <p className="adm-hint">Déjalo vacío para quitar el enlace. El sync de Beatport no escribe estas columnas.</p>
        <button className="adm-btn" type="submit">
          Guardar
        </button>
      </form>
    </div>
  )
}
