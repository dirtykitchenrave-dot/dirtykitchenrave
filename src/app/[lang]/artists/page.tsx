import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ArtistsExplorer from '@/components/ArtistsExplorer'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { artistsWithCounts, getCatalog } from '@/lib/catalog'
import { LABEL_MANAGER_SLUG } from '@/lib/site'
import { alternates } from '@/lib/view'

export const revalidate = 3600

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const d = getDictionary(lang)
  return { title: d.artists.title, description: d.artists.intro, alternates: alternates(lang, '/artists') }
}

export default async function ArtistsPage({ params }: Props) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)
  const c = await getCatalog()
  const list = artistsWithCounts(c)

  return (
    <>
      <header className="page-head">
        <span className="kicker">{list.length}</span>
        <h1 className="page-title">{d.artists.title}</h1>
        <p className="lead">{d.artists.intro}</p>
      </header>
      <ArtistsExplorer
        lang={lang}
        artists={list.map((a) => ({
          id: a.id,
          slug: a.slug,
          name: a.name,
          image: a.image,
          meta:
            (a.slug === LABEL_MANAGER_SLUG ? `${d.artists.labelManager}, ` : '') +
            d.artists.releasesCount(a.releaseCount),
        }))}
        labels={{
          search: d.artists.search,
          one: lang === 'es' ? 'artista' : 'artist',
          many: lang === 'es' ? 'artistas' : 'artists',
          empty: d.artists.empty,
          clear: d.artists.clear,
        }}
      />
    </>
  )
}
