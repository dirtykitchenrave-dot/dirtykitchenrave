import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { alternates } from '@/lib/view'

const DOCS = ['notice', 'privacy', 'cookies'] as const
type Doc = (typeof DOCS)[number]
const isDoc = (v: string): v is Doc => (DOCS as readonly string[]).includes(v)

type Props = { params: Promise<{ lang: string; doc: string }> }

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }))
}

export const dynamicParams = false

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, doc } = await params
  if (!isLang(lang) || !isDoc(doc)) return {}
  const d = getDictionary(lang)
  return { title: d.legal[doc], alternates: alternates(lang, `/legal/${doc}`), robots: { index: false } }
}

/** Legal texts. TODO: replace the placeholder copy with the label's real legal information. */
export default async function LegalPage({ params }: Props) {
  const { lang, doc } = await params
  if (!isLang(lang) || !isDoc(doc)) notFound()
  const d = getDictionary(lang)

  return (
    <>
      <header className="page-head">
        <h1 className="page-title">{d.legal[doc]}</h1>
      </header>
      <section className="pad prose">
        <p>{doc === 'cookies' ? d.legal.cookiesText : d.legal.pending}</p>
      </section>
    </>
  )
}
