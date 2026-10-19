import Link from 'next/link'
import { Flash } from '@/components/admin/Bits'
import { searchTracks } from '@/lib/admin-data'

export const metadata = { title: 'Tracks' }

export default async function TracksPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string }> }) {
  const sp = await searchParams
  const data = await searchTracks(sp.q)

  return (
    <div className="adm-wrap">
      <header className="adm-head">
        <div>
          <h1>Tracks</h1>
          <p>Search by title and edit the Spotify link. Beatport writes the rest.</p>
        </div>
      </header>
      <Flash error={sp.error} />
      <form className="adm-search" action="/administrator/tracks">
        <input name="q" defaultValue={data.q} placeholder="Track title" aria-label="Search tracks" />
        <button className="adm-btn" type="submit">
          Search
        </button>
      </form>
      {data.q.length < 2 ? (
        <p className="adm-muted">Type at least two letters. There are more than a thousand tracks.</p>
      ) : data.rows.length === 0 ? (
        <p className="adm-muted">Nothing for “{data.q}”.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Track</th>
              <th>Release</th>
                <th>Spotify</th>
                {data.tidal ? <th>TIDAL</th> : null}
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/administrator/tracks/${row.id}`}>
                    {row.title}
                    {row.mix_name ? ` (${row.mix_name})` : ''}
                  </Link>
                </td>
                <td>{row.releases?.catalog_number || row.releases?.title || '—'}</td>
                <td>{row.spotify_url ? 'Yes' : '—'}</td>
                {data.tidal ? <td>{row.tidal_url ? 'Yes' : '—'}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
