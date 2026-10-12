'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { locales, switchLangPath, type Lang } from '@/i18n/config'
import { LINKS } from '@/lib/site'

interface NavLabels {
  releases: string
  artists: string
  shop: string
  demos: string
  about: string
  channels: string
  listen: string
  discord: string
  menu: string
  close: string
  langLabel: string
  toTop: string
}

const LANG_SCROLL_KEY = 'dkr-lang-scroll'

function stashScroll(next: Lang, current: Lang) {
  if (next === current) return
  try {
    sessionStorage.setItem(LANG_SCROLL_KEY, String(window.scrollY))
  } catch {
    /* private mode */
  }
}

function takeStashedScroll(): number | null {
  try {
    const raw = sessionStorage.getItem(LANG_SCROLL_KEY)
    if (raw == null) return null
    const y = Number(raw)
    return Number.isFinite(y) ? y : null
  } catch {
    return null
  }
}

function clearStashedScroll() {
  try {
    sessionStorage.removeItem(LANG_SCROLL_KEY)
  } catch {
    /* private mode */
  }
}

export default function Nav({ lang, t }: { lang: Lang; t: NavLabels }) {
  const pathname = usePathname() || `/${lang}`
  const [open, setOpen] = useState(false)
  const [showTop, setShowTop] = useState(false)
  const prevPath = useRef(pathname)

  useEffect(() => {
    const sentinel = document.createElement('div')
    sentinel.setAttribute('aria-hidden', 'true')
    sentinel.style.cssText = 'position:absolute;top:480px;left:0;width:1px;height:1px;pointer-events:none'
    document.body.appendChild(sentinel)
    const io = new IntersectionObserver(
      ([entry]) => setShowTop(!entry.isIntersecting),
      { threshold: 0 },
    )
    io.observe(sentinel)
    return () => {
      io.disconnect()
      sentinel.remove()
    }
  }, [])

  useEffect(() => setOpen(false), [pathname])

  // Next scrolls to the top on a route change. EN/ES is the same page in the
  // other language, so put the viewport back where it was.
  useLayoutEffect(() => {
    const prev = prevPath.current
    const y = takeStashedScroll()
    if (y == null) {
      prevPath.current = pathname
      return
    }
    const langSwap = prev !== pathname && switchLangPath(prev, lang) === pathname
    if (!langSwap) {
      clearStashedScroll()
      prevPath.current = pathname
      return
    }
    const restore = () => window.scrollTo(0, y)
    restore()
    // After Next's own scroll-to-top in this commit, and after Strict Mode
    // replays the effect (prevPath stays on the old route until then).
    const id = requestAnimationFrame(() => {
      restore()
      clearStashedScroll()
      prevPath.current = pathname
    })
    return () => cancelAnimationFrame(id)
  }, [pathname, lang])

  const items = [
    { href: `/${lang}/releases`, label: t.releases },
    { href: `/${lang}/artists`, label: t.artists },
    { href: `/${lang}/shop`, label: t.shop },
    { href: `/${lang}/demos`, label: t.demos },
    { href: `/${lang}/channels`, label: t.channels },
    { href: `/${lang}/about`, label: t.about },
  ]
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/')

  const rememberLang = (l: Lang) => {
    document.cookie = `NEXT_LOCALE=${l}; path=/; max-age=31536000; samesite=lax`
  }

  return (
    <>
      <header className="nav">
        <nav className="nav-links" aria-label="Main">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={i.href.endsWith('/about') ? 'nav-more' : undefined}
              aria-current={isActive(i.href) ? 'page' : undefined}
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <Link className="logo" href={`/${lang}`}>
          <span>DKR</span>
          <img src="/images/logo%20copia.png" alt="" width={720} height={476} />
        </Link>
        <div className="nav-right">
          <div className="lang" role="group" aria-label={t.langLabel}>
            {locales.map((l) => (
              <Link
                key={l}
                href={switchLangPath(pathname, l)}
                scroll={false}
                aria-current={l === lang ? 'true' : undefined}
                hrefLang={l}
                onClick={(e) => {
                  rememberLang(l)
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
                  stashScroll(l, lang)
                }}
              >
                {l.toUpperCase()}
              </Link>
            ))}
          </div>
          <a className="pill" href={LINKS.discord} target="_blank" rel="noopener noreferrer">
            {t.discord}
          </a>
          <a className="pill fill" href={LINKS.beatport} target="_blank" rel="noopener noreferrer">
            {t.listen}
          </a>
          <button
            className="pill menu-btn"
            aria-expanded={open}
            aria-controls="mobile-menu"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? t.close : t.menu}
          </button>
        </div>
      </header>
      {showTop && !open ? (
        <button
          type="button"
          className="to-top"
          aria-label={t.toTop}
          onClick={() => {
            const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
            window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
          }}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path fill="currentColor" d="M12 3.2 20 12.2h-4.6V20.8H8.6v-8.6H4z" />
          </svg>
        </button>
      ) : null}
      <nav id="mobile-menu" className="sheet" data-open={open} aria-label="Mobile">
        <Link href={`/${lang}`}>{lang === 'es' ? 'Inicio' : 'Home'}</Link>
        {items.map((i) => (
          <Link key={i.href} href={i.href}>
            {i.label}
          </Link>
        ))}
        <a href={LINKS.discord} target="_blank" rel="noopener noreferrer">
          {t.discord}
        </a>
      </nav>
    </>
  )
}
