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
    <nav className="adm-pager" aria-label="Páginas">
      {page > 1 ? <Link href={pagerHref(path, query, page - 1)}>Anterior</Link> : <span />}
      <span>
        {page} / {pages}
      </span>
      {page < pages ? <Link href={pagerHref(path, query, page + 1)}>Siguiente</Link> : <span />}
    </nav>
  )
}

export function Flash({ saved, error, catalog }: { saved?: string; error?: string; catalog?: boolean }) {
  if (saved) {
    return <p className="adm-flash">{catalog ? 'Guardado. La web pública se actualiza al momento.' : 'Guardado.'}</p>
  }
  if (error === 'url') return <p className="adm-flash bad">Revisa las URLs: tienen que empezar por http:// o https://.</p>
  if (error === 'long') return <p className="adm-flash bad">Uno de los textos es demasiado largo.</p>
  if (error) return <p className="adm-flash bad">No se ha podido guardar.</p>
  return null
}
