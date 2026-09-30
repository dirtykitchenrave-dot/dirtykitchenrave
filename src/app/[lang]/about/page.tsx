import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Channels from '@/components/Channels'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { LABEL_MANAGER_SLUG, LINKS, SITE } from '@/lib/site'
import { pageMeta } from '@/lib/view'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const d = getDictionary(lang)
  return pageMeta(lang, '/about', d.about.title, d.about.lead)
}

export default async function AboutPage({ params }: Props) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)

  return (
    <>
      <section className="mani">
        <div>
          <p className="quote">{d.about.lead}</p>
        </div>
        <div>
          <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>
            {d.about.title}
          </h1>
          <div className="prose">
            {d.about.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className="tags">
            <Link href={`/${lang}/artists/${LABEL_MANAGER_SLUG}`}>Afghan Headspin</Link>
            <Link href={`/${lang}/releases`}>{d.nav.releases}</Link>
            <Link href={`/${lang}/podcast`}>{d.nav.podcast}</Link>
          </div>
        </div>
      </section>
      <section className="pad">
        <h2 className="big">{d.about.contact}</h2>
        <p className="lead" style={{ marginBottom: '1.5rem' }}>
          {d.about.contactText}
        </p>
        <div className="btns">
          {SITE.contactEmail && (
            <a className="btn" href={`mailto:${SITE.contactEmail}`}>
              {SITE.contactEmail}
            </a>
          )}
          <a className="btn ghost" href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <a className="btn ghost" href={LINKS.instagram} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a className="btn ghost" href={LINKS.discord} target="_blank" rel="noopener noreferrer">
            Discord
          </a>
        </div>
      </section>
      <Channels d={d} />
    </>
  )
}
