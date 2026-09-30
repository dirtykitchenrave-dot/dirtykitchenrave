import Link from 'next/link'
import type { Lang } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import { LINKS } from '@/lib/site'

export default function Footer({ lang, d }: { lang: Lang; d: Dictionary }) {
  const social = [
    { label: 'Instagram', href: LINKS.instagram },
    { label: 'TikTok', href: LINKS.tiktok },
    { label: 'YouTube', href: LINKS.youtube },
    { label: 'Facebook', href: LINKS.facebook },
    { label: 'SoundCloud', href: LINKS.soundcloud },
    { label: 'Spotify', href: LINKS.spotify },
    { label: 'Twitch', href: LINKS.twitch },
    { label: 'Discord', href: LINKS.discord },
  ].filter((s) => s.href)

  return (
    <footer className="foot">
      <p className="wordmark" aria-hidden="true">
        Dirty Kitchen Rave
      </p>
      <div>
        <p>DIRTY KITCHEN RAVE, {d.footer.city}</p>
        <nav aria-label="Social" style={{ marginTop: '.6rem' }}>
          {social.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer">
              {s.label}
            </a>
          ))}
        </nav>
      </div>
      <nav className="legal" aria-label="Legal">
        <Link href={`/${lang}/links`}>Links</Link>
        <Link href={`/${lang}/legal/notice`}>{d.footer.legal}</Link>
        <Link href={`/${lang}/legal/privacy`}>{d.footer.privacy}</Link>
        <Link href={`/${lang}/legal/cookies`}>{d.footer.cookies}</Link>
        <a href="https://www.eskaladigital.com" target="_blank" rel="noopener noreferrer">
          {d.footer.design}
        </a>
      </nav>
    </footer>
  )
}
