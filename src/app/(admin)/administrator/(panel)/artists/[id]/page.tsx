import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Flash } from '@/components/admin/Bits'
import { saveArtist } from '@/lib/admin-actions'
import { getArtist } from '@/lib/admin-data'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const artist = await getArtist(Number(id))
  return { title: artist?.name || 'Artist' }
}

export default async function ArtistEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const { id } = await params
  const n = Number(id)
  if (!Number.isSafeInteger(n) || n <= 0) notFound()
  const artist = await getArtist(n)
  if (!artist) notFound()
  const sp = await searchParams

  return (
    <div className="adm-wrap adm-narrow">
      <p className="adm-back">
        <Link href="/administrator/artists">← Artists</Link>
      </p>
      <header className="adm-head">
        <div>
          <h1>{artist.name}</h1>
          <p>
            {artist.slug}
            {artist.beatport_url ? (
              <>
                {' '}
                · <a href={artist.beatport_url}>Beatport</a>
              </>
            ) : null}{' '}
            · <Link href={`/en/artists/${artist.slug}`}>View on site</Link>
          </p>
        </div>
      </header>
      <Flash saved={sp.saved} error={sp.error} catalog />
      <form className="adm-form adm-panel" action={saveArtist}>
        <input type="hidden" name="id" value={artist.id} />
        <label className="adm-check">
          <input type="checkbox" name="is_roster" defaultChecked={artist.is_roster} />
          On the roster
        </label>
        <div className="adm-grid">
          <label>
            Country
            <input name="country" defaultValue={artist.country || ''} maxLength={80} />
          </label>
          <label>
            Photo (URL)
            <input name="image_url" defaultValue={artist.image_url || ''} maxLength={400} />
          </label>
        </div>
        <p className="adm-hint">A photo that is not from Beatport stays. A Beatport URL can be replaced by the daily sync.</p>
        <label>
          Bio (Spanish)
          <textarea name="bio_es" rows={7} maxLength={8000} defaultValue={artist.bio_es || ''} />
        </label>
        <label>
          Bio (English)
          <textarea name="bio_en" rows={7} maxLength={8000} defaultValue={artist.bio_en || ''} />
        </label>
        <div className="adm-grid">
          <label>
            Bandcamp
            <input name="bandcamp_url" defaultValue={artist.bandcamp_url || ''} maxLength={400} />
          </label>
          <label>
            Spotify
            <input name="spotify_url" defaultValue={artist.spotify_url || ''} maxLength={400} />
          </label>
          <label>
            SoundCloud
            <input name="soundcloud_url" defaultValue={artist.soundcloud_url || ''} maxLength={400} />
          </label>
          <label>
            Instagram
            <input name="instagram_url" defaultValue={artist.instagram_url || ''} maxLength={400} />
          </label>
        </div>
        <button className="adm-btn" type="submit">
          Save
        </button>
      </form>
    </div>
  )
}
