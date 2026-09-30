import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PagedReleases } from '@/components/ReleasesExplorer'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { genres, getCatalog, releasesByGenre } from '@/lib/catalog'
import { pageMeta, toCard } from '@/lib/view'

export const revalidate = 3600

type Props = { params: Promise<{ lang: string; slug: string }> }

export async function generateStaticParams() {
  const c = await getCatalog()
  return genres(c).map((g) => ({ slug: g.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = await params
  if (!isLang(lang)) return {}
  const c = await getCatalog()
  const g = genres(c).find((x) => x.slug === slug)
  if (!g) return {}
  const d = getDictionary(lang)
  return pageMeta(lang, `/genres/${slug}`, d.genres.title(g.name), d.genres.metaDescription(g.name, g.count))
}

export default async function GenrePage({ params }: Props) {
  const { lang, slug } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)
  const c = await getCatalog()
  const g = genres(c).find((x) => x.slug === slug)
  if (!g) notFound()
  const list = releasesByGenre(c, slug)

  return (
    <>
      <header className="page-head orange">
        <span className="kicker">{d.genres.intro(list.length)}</span>
        <h1 className="page-title">{g.name}</h1>
      </header>
      <PagedReleases
        items={list.map((r) => toCard(c, r, lang))}
        lang={lang}
        upcomingLabel={d.releases.upcoming}
        playLabel={d.release.play}
        moreLabel={d.releases.more}
      />
    </>
  )
}
