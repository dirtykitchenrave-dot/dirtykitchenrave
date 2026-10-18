'use client'

import { useActionState } from 'react'
import type { Lang } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import type { BookingState } from '@/lib/booking'
import { submitBooking } from '@/lib/booking-action'

const idle: BookingState = { status: 'idle' }

export default function BookingForm({
  lang,
  t,
  today,
  latest,
}: {
  lang: Lang
  t: Dictionary['booking']
  today: string
  latest: string
}) {
  const [state, action, pending] = useActionState(submitBooking, idle)

  if (state.status === 'ok') {
    return (
      <div className="book-done" role="status">
        <h2>{t.successTitle}</h2>
        <p>{t.success}</p>
      </div>
    )
  }

  return (
    <form className="book-form" action={action} noValidate>
      <input type="hidden" name="lang" value={lang} />
      <p className="hp" aria-hidden="true">
        <label>
          Company
          <input type="text" name="company_website" tabIndex={-1} autoComplete="off" />
        </label>
      </p>

      {state.status === 'error' ? (
        <p className="book-error" role="alert">
          {t.errors[state.code]}
        </p>
      ) : null}

      <div className="pair">
        <label>
          <span className="cap">{t.name}</span>
          <input name="contact_name" type="text" required maxLength={80} autoComplete="name" />
        </label>
        <label>
          <span className="cap">{t.email}</span>
          <input name="contact_email" type="email" required maxLength={160} autoComplete="email" />
        </label>
      </div>

      <div className="pair">
        <label>
          <span className="cap">{t.phone}</span>
          <input name="contact_phone" type="tel" required maxLength={40} autoComplete="tel" />
        </label>
        <label>
          <span className="cap">{t.organisation}</span>
          <input name="organisation" type="text" required maxLength={120} autoComplete="organization" />
        </label>
      </div>

      <label>
        <span className="cap">{t.eventName}</span>
        <input name="event_name" type="text" required maxLength={160} autoComplete="off" />
      </label>

      <div className="pair">
        <label>
          <span className="cap">{t.date}</span>
          <input name="event_date" type="date" required min={today} max={latest} />
        </label>
        <label>
          <span className="cap">{t.setMinutes}</span>
          <input name="set_minutes" type="number" required min={15} max={480} inputMode="numeric" />
        </label>
      </div>

      <div className="pair">
        <label>
          <span className="cap">{t.city}</span>
          <input name="city" type="text" required maxLength={80} autoComplete="address-level2" />
        </label>
        <label>
          <span className="cap">{t.country}</span>
          <input name="country" type="text" required maxLength={80} autoComplete="country-name" />
        </label>
      </div>

      <label>
        <span className="cap">{t.venue}</span>
        <input name="venue" type="text" required maxLength={120} autoComplete="off" />
      </label>

      <label>
        <span className="cap">{t.fee}</span>
        <input name="fee_offer" type="text" required maxLength={80} placeholder={t.feeHint} autoComplete="off" />
      </label>

      <label>
        <span className="cap">{t.message}</span>
        <textarea name="message" required rows={4} maxLength={1200} placeholder={t.messageHint} />
      </label>

      <label className="check">
        <input name="privacy" type="checkbox" required />
        <span>{t.privacy}</span>
      </label>

      <div className="book-send">
        <button className="btn" type="submit" disabled={pending}>
          {pending ? t.sending : t.submit}
        </button>
      </div>
    </form>
  )
}
