import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { LINKS } from '@/lib/site'
import { pageMeta } from '@/lib/view'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const d = getDictionary(lang)
  return pageMeta(lang, '/podcast', d.podcast.title, d.podcast.lead)
}

export default async function PodcastPage({ params }: Props) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)

  return (
    <>
      <header className="page-head ink">
        <h1 className="page-title" style={{ fontStretch: '62%', fontSize: 'clamp(4rem,14vw,12rem)' }}>
          {d.podcast.title}
        </h1>
        <p className="lead">{d.podcast.lead}</p>
      </header>
      <section className="pad">
        <a className="btn" href={LINKS.podcast} target="_blank" rel="noopener noreferrer">
          {d.podcast.cta}
        </a>
      </section>
    </>
  )
}
