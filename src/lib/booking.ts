import type { Lang } from '@/i18n/config'

export type BookingError =
  | 'name'
  | 'email'
  | 'phone'
  | 'organisation'
  | 'event'
  | 'date'
  | 'city'
  | 'country'
  | 'venue'
  | 'minutes'
  | 'fee'
  | 'message'
  | 'privacy'
  | 'duplicate'
  | 'unavailable'

export type BookingState = { status: 'idle' } | { status: 'ok' } | { status: 'error'; code: BookingError }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^[0-9+().\-\s]{6,40}$/

export function calendarToday(timeZone = 'Europe/London'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(),
  )
}

export function addMonths(iso: string, months: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1 + months, d))
  return dt.toISOString().slice(0, 10)
}

export function field(formData: FormData, name: string): string {
  return String(formData.get(name) ?? '').replace(/\s+/g, ' ').trim()
}

export type BookingInput = {
  lang: Lang
  name: string
  email: string
  phone: string
  organisation: string
  eventName: string
  eventDate: string
  city: string
  country: string
  venue: string
  setMinutes: number
  fee: string
  message: string
}

/** Collective booking. Every field the visitor sees is required. There is no event link. */
export function readBooking(formData: FormData): { error: BookingError } | { row: BookingInput } {
  const lang: Lang = formData.get('lang') === 'es' ? 'es' : 'en'
  const name = field(formData, 'contact_name')
  const email = field(formData, 'contact_email').toLowerCase()
  const phone = field(formData, 'contact_phone')
  const organisation = field(formData, 'organisation')
  const eventName = field(formData, 'event_name')
  const eventDate = field(formData, 'event_date')
  const city = field(formData, 'city')
  const country = field(formData, 'country')
  const venue = field(formData, 'venue')
  const minutesRaw = field(formData, 'set_minutes')
  const fee = field(formData, 'fee_offer')
  const message = String(formData.get('message') ?? '').trim()
  const privacy = formData.get('privacy') === 'on'

  if (name.length < 2 || name.length > 80) return { error: 'name' }
  if (!EMAIL.test(email) || email.length > 160) return { error: 'email' }
  if (!PHONE.test(phone)) return { error: 'phone' }
  if (organisation.length < 2 || organisation.length > 120) return { error: 'organisation' }
  if (eventName.length < 2 || eventName.length > 160) return { error: 'event' }

  const today = calendarToday()
  const latest = addMonths(today, 18)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(eventDate) || eventDate < today || eventDate > latest) {
    return { error: 'date' }
  }
  if (city.length < 2 || city.length > 80) return { error: 'city' }
  if (country.length < 2 || country.length > 80) return { error: 'country' }
  if (venue.length < 2 || venue.length > 120) return { error: 'venue' }
  if (!/^\d{1,3}$/.test(minutesRaw)) return { error: 'minutes' }
  const setMinutes = Number(minutesRaw)
  if (setMinutes < 15 || setMinutes > 480) return { error: 'minutes' }
  if (fee.length < 1 || fee.length > 80) return { error: 'fee' }
  if (message.length < 2 || message.length > 1200) return { error: 'message' }
  if (!privacy) return { error: 'privacy' }

  return {
    row: {
      lang,
      name,
      email,
      phone,
      organisation,
      eventName,
      eventDate,
      city,
      country,
      venue,
      setMinutes,
      fee,
      message,
    },
  }
}
