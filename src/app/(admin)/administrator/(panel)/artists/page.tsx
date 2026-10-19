import Link from 'next/link'
import { Flash, Pager } from '@/components/admin/Bits'
import { listArtists } from '@/lib/admin-data'

export const metadata = { title: 'Artistas' }

export default async function ArtistsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; roster?: string; error?: string }>
}) {
  const sp = await searchParams
  const roster = sp.roster === '1'
  const data = await listArtists(sp.q, sp.page, roster)
  const query = { q: data.q || undefined, roster: roster ? '1' : undefined }

  return (
    <div className="adm-wrap">
      <header className="adm-head">
        <div>
          <h1>Artistas</h1>
          <p>
            {data.total.toLocaleString('es-ES')} fichas. Bio, roster, país y enlaces. Nombre y Beatport los sigue trayendo el sync.
          </p>
        </div>
      </header>
      <Flash error={sp.error} />
      <form className="adm-search" action="/administrator/artists">
        {roster ? <input type="hidden" name="roster" value="1" /> : null}
        <input name="q" defaultValue={data.q} placeholder="Nombre" aria-label="Buscar artista" />
        <button className="adm-btn" type="submit">
          Buscar
        </button>
        <Link href={roster ? '/administrator/artists' : '/administrator/artists?roster=1'} className={roster ? 'on' : undefined}>
          {roster ? 'Ver todos' : 'Solo roster'}
        </Link>
      </form>
      {data.rows.length === 0 ? (
        <p className="adm-muted">Nada con esa búsqueda.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>País</th>
              <th>Roster</th>
              <th>Bio</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <Link href={`/administrator/artists/${row.id}`}>{row.name}</Link>
                </td>
                <td>{row.country || '—'}</td>
                <td>{row.is_roster ? 'Sí' : '—'}</td>
                <td>{row.bio_es || row.bio_en ? 'Sí' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pager path="/administrator/artists" query={query} page={data.page} pages={data.pages} />
    </div>
  )
}
