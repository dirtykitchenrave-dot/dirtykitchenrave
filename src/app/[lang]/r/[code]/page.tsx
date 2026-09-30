import { notFound, permanentRedirect } from 'next/navigation'
import { isLang } from '@/i18n/config'
import { findReleaseByCatalog, getCatalog } from '@/lib/catalog'

/** Short links by catalogue number: /dkr0237 -> (proxy) -> /en/r/dkr0237 -> /en/releases/dkr0237-romero */
export default async function ShortLink({ params }: { params: Promise<{ lang: string; code: string }> }) {
  const { lang, code } = await params
  if (!isLang(lang)) notFound()
  const c = await getCatalog()
  const r = findReleaseByCatalog(c, code)
  if (!r) notFound()
  return permanentRedirect(`/${lang}/releases/${r.slug}`)
}
