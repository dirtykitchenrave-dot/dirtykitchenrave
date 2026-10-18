'use server'

import { serviceClient } from './beatport/sinks'
import { field, readBooking, type BookingState } from './booking'

export async function submitBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  if (field(formData, 'company_website')) return { status: 'ok' }

  const parsed = readBooking(formData)
  if ('error' in parsed) return { status: 'error', code: parsed.error }
  const row = parsed.row

  try {
    const sb = serviceClient()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: existing, error: lookupError } = await sb
      .from('booking_requests')
      .select('id')
      .eq('contact_email', row.email)
      .ilike('event_name', row.eventName)
      .ilike('city', row.city)
      .gte('created_at', since)
      .limit(1)
    if (lookupError) {
      console.error('booking lookup', lookupError.message)
      return { status: 'error', code: 'unavailable' }
    }
    if (existing && existing.length) return { status: 'error', code: 'duplicate' }

    const { error } = await sb.from('booking_requests').insert({
      lang: row.lang,
      contact_name: row.name,
      contact_email: row.email,
      contact_phone: row.phone,
      organisation: row.organisation,
      event_name: row.eventName,
      event_date: row.eventDate,
      city: row.city,
      country: row.country,
      venue: row.venue,
      set_minutes: row.setMinutes,
      fee_offer: row.fee,
      message: row.message,
    })
    if (error) {
      console.error('booking insert', error.message)
      return { status: 'error', code: 'unavailable' }
    }
  } catch (err) {
    console.error('booking', err instanceof Error ? err.message : err)
    return { status: 'error', code: 'unavailable' }
  }

  return { status: 'ok' }
}
