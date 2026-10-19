import Link from 'next/link'
import { Flash } from '@/components/admin/Bits'
import { saveBooking } from '@/lib/admin-actions'
import { BOOKING_STATUS, bookingStatus, formatDay, formatStamp, listBookings, statusLabel } from '@/lib/admin-data'

export const metadata = { title: 'Bookings' }

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; saved?: string; error?: string }>
}) {
  const sp = await searchParams
  const status = bookingStatus(sp.status)
  const rows = await listBookings(status)

  return (
    <div className="adm-wrap">
      <header className="adm-head">
        <div>
          <h1>Bookings</h1>
          <p>Label night requests. Status, who it is assigned to and the note stay internal.</p>
        </div>
      </header>
      <Flash saved={sp.saved} error={sp.error} />
      <div className="adm-filters">
        <Link href="/administrator/bookings" className={!status ? 'on' : undefined}>
          All
        </Link>
        {BOOKING_STATUS.map((item) => (
          <Link key={item.value} href={`/administrator/bookings?status=${item.value}`} className={status === item.value ? 'on' : undefined}>
            {item.label}
          </Link>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="adm-muted">No bookings{status ? ` in “${statusLabel(status)}”` : ''}.</p>
      ) : (
        <div className="adm-stack">
          {rows.map((row) => (
            <article key={row.id} className="adm-panel">
              <div className="adm-booking-top">
                <div>
                  <h2>{row.event_name}</h2>
                  <p className="adm-muted">
                    {row.organisation} · {row.venue}, {row.city}, {row.country} · {formatDay(row.event_date)} · {row.set_minutes} min
                  </p>
                </div>
                <em className={`st st-${row.status}`}>{statusLabel(row.status)}</em>
              </div>
              <dl className="adm-dl">
                <div>
                  <dt>Contact</dt>
                  <dd>
                    {row.contact_name}
                    <br />
                    <a href={`mailto:${row.contact_email}`}>{row.contact_email}</a>
                    <br />
                    <a href={`tel:${row.contact_phone}`}>{row.contact_phone}</a>
                  </dd>
                </div>
                <div>
                  <dt>Fee</dt>
                  <dd>{row.fee_offer}</dd>
                </div>
                <div>
                  <dt>Received</dt>
                  <dd>
                    {formatStamp(row.created_at)} · {row.lang.toUpperCase()}
                  </dd>
                </div>
              </dl>
              <p className="adm-message">{row.message}</p>
              <form className="adm-form" action={saveBooking}>
                <input type="hidden" name="id" value={row.id} />
                <div className="adm-grid">
                  <label>
                    Status
                    <select name="status" defaultValue={row.status}>
                      {BOOKING_STATUS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Assigned artist
                    <input name="assigned_artist" defaultValue={row.assigned_artist || ''} maxLength={120} />
                  </label>
                </div>
                <label>
                  Internal note
                  <textarea name="admin_note" rows={3} maxLength={2000} defaultValue={row.admin_note || ''} />
                </label>
                <button className="adm-btn" type="submit">
                  Save
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}
