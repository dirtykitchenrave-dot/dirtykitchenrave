import Link from 'next/link'

export function pagerHref(path: string, query: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) if (value) params.set(key, value)
  if (page > 1) params.set('page', String(page))
  const search = params.toString()
  return search ? `${path}?${search}` : path
}

export function Pager({
  path,
  query,
  page,
  pages,
}: {
  path: string
  query: Record<string, string | undefined>
  page: number
  pages: number
}) {
  if (pages <= 1) return null
  return (
    <nav className="adm-pager" aria-label="Pages">
      {page > 1 ? <Link href={pagerHref(path, query, page - 1)}>Previous</Link> : <span />}
      <span>
        {page} / {pages}
      </span>
      {page < pages ? <Link href={pagerHref(path, query, page + 1)}>Next</Link> : <span />}
    </nav>
  )
}

export function Flash({ saved, error, catalog }: { saved?: string; error?: string; catalog?: boolean }) {
  if (saved) {
    return <p className="adm-flash">{catalog ? 'Saved. The public site updates straight away.' : 'Saved.'}</p>
  }
  if (error === 'url') return <p className="adm-flash bad">Check the URLs: they have to start with http:// or https://.</p>
  if (error === 'long') return <p className="adm-flash bad">One of the texts is too long.</p>
  if (error) return <p className="adm-flash bad">Could not save.</p>
  return null
}
