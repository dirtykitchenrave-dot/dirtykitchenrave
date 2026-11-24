'use server'

import { readBookingsFile, writeBookingsFile } from './catalog-store'
import type { BookingRow } from './admin-data'
import { field, readBooking, type BookingState } from './booking'

export async function submitBooking(_prev: BookingState, formData: FormData): Promise<BookingState> {
  if (field(formData, 'company_website')) return { status: 'ok' }

  const parsed = readBooking(formData)
  if ('error' in parsed) return { status: 'error', code: parsed.error }
  const row = parsed.row

  try {
    const rows = await readBookingsFile<BookingRow>()
    const since = Date.now() - 24 * 60 * 60 * 1000
    const duplicate = rows.some((existing) => {
      const created = new Date(existing.created_at).getTime()
      return (
        created >= since &&
        existing.contact_email.toLowerCase() === row.email &&
        existing.event_name.toLowerCase() === row.eventName.toLowerCase() &&
        existing.city.toLowerCase() === row.city.toLowerCase()
      )
    })
    if (duplicate) return { status: 'error', code: 'duplicate' }

    const nextId = rows.reduce((max, item) => Math.max(max, item.id), 0) + 1
    rows.push({
      id: nextId,
      created_at: new Date().toISOString(),
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
      status: 'new',
      assigned_artist: null,
      admin_note: null,
    })
    await writeBookingsFile(rows, `Booking: ${row.eventName} (${row.city})`)
  } catch (err) {
    console.error('booking', err instanceof Error ? err.message : err)
    return { status: 'error', code: 'unavailable' }
  }

  return { status: 'ok' }
}
