'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'

export const OPEN_COOKIE_SETTINGS = 'openCookieSettings'
const KEY = 'dkr_cookie_consent'
const PREFS_KEY = 'dkr_cookie_preferences'

type Prefs = { necessary: true; analytics: boolean; functional: boolean; marketing: boolean }
type Optional = Exclude<keyof Prefs, 'necessary'>
type Labels = Dictionary['cookieBanner']

const ALL_ON: Prefs = { necessary: true, analytics: true, functional: true, marketing: true }
const ONLY_NECESSARY: Prefs = { necessary: true, analytics: false, functional: false, marketing: false }

function updateGtag(prefs: Prefs) {
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag
  if (!gtag) return
  const ads = prefs.marketing ? 'granted' : 'denied'
  gtag('consent', 'update', {
    analytics_storage: prefs.analytics ? 'granted' : 'denied',
    ad_storage: ads,
    ad_user_data: ads,
    ad_personalization: ads,
  })
}

function persist(prefs: Prefs) {
  try {
    localStorage.setItem(KEY, prefs.analytics ? 'granted' : 'denied')
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    /* private mode */
  }
  updateGtag(prefs)
}

function readPrefs(): Prefs | null {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as Partial<Prefs>
    return { necessary: true, analytics: !!p.analytics, functional: !!p.functional, marketing: !!p.marketing }
  } catch {
    return null
  }
}

export function CookieSettingsButton({ label }: { label: string }) {
  return (
    <button type="button" className="linklike" onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS))}>
      {label}
    </button>
  )
}

function CookieIcon() {
  return (
    <svg className="ck-icon" viewBox="0 0 24 24" width="32" height="32" aria-hidden="true">
      <path
        d="M21.5 12.3A9.5 9.5 0 1 1 11.7 2.5a3 3 0 0 0 3.6 3.6 3 3 0 0 0 3.6 3.6 3 3 0 0 0 2.6 2.6Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="10" r="1.3" fill="currentColor" />
      <circle cx="12" cy="15.5" r="1.3" fill="currentColor" />
      <circle cx="16" cy="13" r="1" fill="currentColor" />
    </svg>
  )
}

export default function CookieBanner({ lang, t }: { lang: Lang; t: Labels }) {
  const [view, setView] = useState<'hidden' | 'banner' | 'settings'>('hidden')
  // AEPD: nothing pre-ticked. Without prior consent, only the necessary ones.
  const [prefs, setPrefs] = useState<Prefs>(ONLY_NECESSARY)

  useEffect(() => {
    const stored = readPrefs()
    if (stored) {
      setPrefs(stored)
      updateGtag(stored)
    } else {
      setView('banner')
    }
    const open = () => {
      setPrefs(readPrefs() ?? ONLY_NECESSARY)
      setView('settings')
    }
    window.addEventListener(OPEN_COOKIE_SETTINGS, open)
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS, open)
  }, [])

  const choose = useCallback((next: Prefs) => {
    persist(next)
    setPrefs(next)
    setView('hidden')
  }, [])

  if (view === 'hidden') return null

  const policy = (
    <Link href={`/${lang}/legal/cookies`} onClick={() => setView('hidden')}>
      {t.policy}
    </Link>
  )

  if (view === 'settings') {
    const optional: { key: Optional; title: string; text: string }[] = [
      { key: 'analytics', title: t.analytics, text: t.analyticsText },
      { key: 'functional', title: t.functional, text: t.functionalText },
      { key: 'marketing', title: t.marketing, text: t.marketingText },
    ]
    return (
      <div className="ck-overlay" role="dialog" aria-modal="true" aria-labelledby="ck-title">
        <div className="ck-modal">
          <header className="ck-head">
            <CookieIcon />
            <h2 id="ck-title">{t.settingsTitle}</h2>
            <button
              type="button"
              className="ck-close"
              aria-label={t.close}
              onClick={() => setView(readPrefs() ? 'hidden' : 'banner')}
            >
              ×
            </button>
          </header>
          <div className="ck-body">
            <p>{t.settingsIntro}</p>
            <div className="ck-cat on">
              <div className="ck-cat-head">
                <h3>{t.necessary}</h3>
                <span className="ck-always">{t.alwaysOn}</span>
              </div>
              <p>{t.necessaryText}</p>
            </div>
            {optional.map((c) => (
              <div key={c.key} className={`ck-cat${prefs[c.key] ? ' on' : ''}`}>
                <div className="ck-cat-head">
                  <h3>{c.title}</h3>
                  <label className="ck-switch">
                    <input
                      type="checkbox"
                      checked={prefs[c.key]}
                      aria-label={c.title}
                      onChange={(e) => setPrefs((p) => ({ ...p, [c.key]: e.target.checked }))}
                    />
                    <span />
                  </label>
                </div>
                <p>{c.text}</p>
              </div>
            ))}
            <p className="ck-more">
              {t.moreInfo} {policy}.
            </p>
          </div>
          <footer className="ck-actions">
            <button type="button" className="btn ghost" onClick={() => choose(ONLY_NECESSARY)}>
              {t.rejectAll}
            </button>
            <button type="button" className="btn ghost" onClick={() => choose(prefs)}>
              {t.save}
            </button>
            <button type="button" className="btn" onClick={() => choose(ALL_ON)}>
              {t.acceptAll}
            </button>
          </footer>
        </div>
      </div>
    )
  }

  return (
    <div className="ck-bar" role="region" aria-label={t.bannerLabel}>
      <div className="ck-text">
        <CookieIcon />
        <div>
          <h3>{t.title}</h3>
          <p>
            {t.text} {policy}
          </p>
        </div>
      </div>
      {/* AEPD: Reject on the first layer, same visual weight as Accept. */}
      <div className="ck-btns">
        <button type="button" className="btn ghost" onClick={() => setView('settings')}>
          {t.configure}
        </button>
        <button type="button" className="btn" onClick={() => choose(ONLY_NECESSARY)}>
          {t.rejectAll}
        </button>
        <button type="button" className="btn" onClick={() => choose(ALL_ON)}>
          {t.acceptAll}
        </button>
      </div>
    </div>
  )
}
