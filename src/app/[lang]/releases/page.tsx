import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import ReleasesExplorer from '@/components/ReleasesExplorer'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { genres, getCatalog, sortedReleases } from '@/lib/catalog'
import { chipGenre, pageMeta, toExplorerItem } from '@/lib/view'

export const revalidate = 3600

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const d = getDictionary(lang)
  return pageMeta(lang, '/releases', d.releases.title, d.releases.intro)
}

export default async function ReleasesPage({ params }: Props) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)
  const c = await getCatalog()
  const items = sortedReleases(c).map((r) => toExplorerItem(c, r, lang))

  return (
    <>
      <header className="page-head">
        <span className="kicker">{d.releases.results(items.length)}</span>
        <h1 className="page-title">{d.releases.title}</h1>
        <p className="lead">{d.releases.intro}</p>
      </header>
      <ReleasesExplorer
        lang={lang}
        items={items}
        genres={genres(c).map((g) => ({ slug: g.slug, name: chipGenre(g.name), title: g.name }))}
        labels={{
          search: d.releases.search,
          allGenres: d.releases.allGenres,
          allYears: d.releases.allYears,
          allTypes: d.releases.allTypes,
          types: d.releases.types,
          one: lang === 'es' ? 'lanzamiento' : 'release',
          many: lang === 'es' ? 'lanzamientos' : 'releases',
          empty: d.releases.empty,
          clear: d.releases.clear,
          upcoming: d.releases.upcoming,
          play: d.release.play,
          more: d.releases.more,
          views: d.views,
        }}
      />
    </>
  )
}
