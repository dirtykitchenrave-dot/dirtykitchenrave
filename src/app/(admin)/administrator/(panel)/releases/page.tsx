import Link from 'next/link'
import { Flash, Pager } from '@/components/admin/Bits'
import { formatDay, listReleases } from '@/lib/admin-data'

export const metadata = { title: 'Releases' }

export default async function ReleasesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; featured?: string; error?: string }>
}) {
  const sp = await searchParams
  const featured = sp.featured === '1'
  const data = await listReleases(sp.q, sp.page, featured)
  const query = { q: data.q || undefined, featured: featured ? '1' : undefined }

  return (
    <div className="adm-wrap">
      <header className="adm-head">
        <div>
          <h1>Releases</h1>
          <p>
            {data.total.toLocaleString('en-GB')} releases. Note, hero and shop links. Title, date and artwork come from Beatport.
          </p>
        </div>
      </header>
      <Flash error={sp.error} />
      <form className="adm-search" action="/administrator/releases">
        {featured ? <input type="hidden" name="featured" value="1" /> : null}
        <input name="q" defaultValue={data.q} placeholder="Title or catalogue number" aria-label="Search releases" />
        <button className="adm-btn" type="submit">
          Search
        </button>
        <Link href={featured ? '/administrator/releases' : '/administrator/releases?featured=1'} className={featured ? 'on' : undefined}>
          {featured ? 'All releases' : 'Hero only'}
        </Link>
      </form>
      {data.rows.length === 0 ? (
        <p className="adm-muted">Nothing matches that search.</p>
      ) : (
        <table className="adm-table">
          <thead>
            <tr>
              <th>Catalogue</th>
              <th>Title</th>
              <th>Date</th>
              <th>Hero</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((row) => (
              <tr key={row.id}>
                <td>{row.catalog_number || '—'}</td>
                <td>
                  <Link href={`/administrator/releases/${row.id}`}>{row.title}</Link>
                </td>
                <td>{formatDay(String(row.release_date).slice(0, 10))}</td>
                <td>{row.is_featured ? 'Yes' : '—'}</td>
                <td>{row.note_es || row.note_en ? 'Yes' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <Pager path="/administrator/releases" query={query} page={data.page} pages={data.pages} />
    </div>
  )
}
