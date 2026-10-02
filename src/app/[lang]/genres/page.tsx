import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { genres, getCatalog } from '@/lib/catalog'
import { pageMeta } from '@/lib/view'

export const revalidate = 3600

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const d = getDictionary(lang)
  return pageMeta(lang, '/genres', d.genres.indexTitle, d.genres.indexDescription)
}

export default async function GenresPage({ params }: Props) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)
  const c = await getCatalog()
  const list = genres(c)

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">{d.genres.indexTitle}</h1>
        <p className="lead">{d.genres.indexDescription}</p>
      </header>
      <section className="pad">
        <p className="crew">
          {list.map((g) => (
            <Link key={g.slug} href={`/${lang}/genres/${g.slug}`}>
              {g.name} <small style={{ fontSize: '.4em' }}>{g.count}</small>
            </Link>
          ))}
        </p>
      </section>
    </>
  )
}
