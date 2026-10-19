import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import BookingForm from '@/components/BookingForm'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { addMonths, calendarToday } from '@/lib/booking'
import { pageMeta } from '@/lib/view'

type Props = { params: Promise<{ lang: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const d = getDictionary(lang)
  return pageMeta(lang, '/booking', d.booking.title, d.booking.metaDescription)
}

export default async function BookingPage({ params }: Props) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)
  const today = calendarToday()

  return (
    <>
      <header className="page-head orange">
        <h1 className="page-title">{d.booking.title}</h1>
        <p className="lead book-lead">{d.booking.lead}</p>
      </header>
      <section className="pad">
        <BookingForm lang={lang} t={d.booking} today={today} latest={addMonths(today, 18)} />
      </section>
    </>
  )
}
