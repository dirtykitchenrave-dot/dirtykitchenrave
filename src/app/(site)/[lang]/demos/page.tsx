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
  return pageMeta(lang, '/demos', d.demos.title, d.demos.metaDescription)
}

export default async function DemosPage({ params }: Props) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)

  return (
    <>
      <header className="page-head orange">
        <h1 className="page-title" style={{ fontStretch: '62%', fontSize: 'clamp(4rem,14vw,12rem)' }}>
          {d.demos.title}
        </h1>
        <p className="lead">{d.demos.lead}</p>
      </header>
      <section className="pad prose">
        {d.demos.body.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p style={{ marginTop: '2rem' }}>
          <a className="btn" href={LINKS.demos} target="_blank" rel="noopener noreferrer">
            {d.demos.cta}
          </a>
        </p>
      </section>
    </>
  )
}
