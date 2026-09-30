import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Channels from '@/components/Channels'
import ShopGrid from '@/components/ShopGrid'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { LINKS } from '@/lib/site'
import { alternates } from '@/lib/view'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const d = getDictionary(lang)
  return { title: d.shop.title, description: d.shop.intro, alternates: alternates(lang, '/shop') }
}

export default async function ShopPage({ params }: Props) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)

  return (
    <>
      <header className="page-head orange">
        <h1 className="page-title">{d.shop.title}</h1>
        <p className="lead">{d.shop.intro}</p>
      </header>
      <section>
        <ShopGrid d={d} />
      </section>
      <section className="pad">
        <h2 className="big">{d.shop.amazon}</h2>
        <div className="btns">
          <a className="btn ghost" href={LINKS.merchUs} target="_blank" rel="noopener noreferrer">
            Amazon US
          </a>
          <a className="btn ghost" href={LINKS.merchUk} target="_blank" rel="noopener noreferrer">
            Amazon UK
          </a>
        </div>
      </section>
      <section className="pad-top" style={{ borderBottom: 0 }}>
        <h2 className="big">{d.shop.digital}</h2>
      </section>
      <Channels d={d} />
    </>
  )
}
