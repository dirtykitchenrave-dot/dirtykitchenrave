import Link from 'next/link'
import { Flash } from '@/components/admin/Bits'
import { searchTracks } from '@/lib/admin-data'

export const metadata = { title: 'Temas' }

export default async function TracksPage({ searchParams }: { searchParams: Promise<{ q?: string; error?: string }> }) {
  const sp = await searchParams
  const data = await searchTracks(sp.q)

  return (
    <div className="adm-wrap">
      <header className="adm-head">
        <div>
          <h1>Temas</h1>
          <p>Busca por título y edita el enlace de Spotify. El resto lo escribe Beatport.</p>
        </div>
      </header>
      <Flash error={sp.error} />
      <form className="adm-search" action="/administrator/tracks">
        <input name="q" defaultValue={data.q} placeholder="Título del tema" aria-label="Buscar tema" />
        <button className="adm-btn" type="submit">
          Buscar
        </button>
      </form>
      {data.q.length < 2 ? (
        <p className="adm-muted">Escribe al menos dos letras. Hay más de mil temas y no caben en una lista.</p>
      ) : data.rows.length === 0 ? (
        <p className="adm-muted">Nada con «{data.q}».</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Tema</th>
              <th>Disco</th>
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
                <td>{row.spotify_url ? 'Sí' : '—'}</td>
                {data.tidal ? <td>{row.tidal_url ? 'Sí' : '—'}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
