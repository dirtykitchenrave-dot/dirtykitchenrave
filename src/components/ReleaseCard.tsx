import Link from 'next/link'
import type { Lang } from '@/i18n/config'
import Artwork from './Artwork'
import CardPlay from './CardPlay'
import type { PlayerTrack } from './Player'

export interface ReleaseCardData {
  slug: string
  title: string
  catalog: string | null
  artwork: string | null
  artists: string
  /** Each name links to its artist page. Empty for "Various Artists". */
  artistLinks: { name: string; slug: string }[]
  genre: string
  /** Internal genre page. Omit when `genre` is a stand-in label (upcoming date). */
  genreHref?: string
  /** Used to join artist names ("y" / "&"). */
  lang: Lang
  /** Formatted release date, e.g. "30 Sept 2026". */
  date: string
  /** ISO date (YYYY-MM-DD) for the <time> element. */
  dateIso: string
  upcoming: boolean
  /** First Beatport preview of the release (null if none). */
  preview?: PlayerTrack | null
}

/**
 * Card from proposal 05 ("drop"): cover, catalogue/date row, title and artists.
 * The whole card links to the release; the round button on the cover plays the preview in place.
 */
export default function ReleaseCard({
  r,
  href,
  upcomingLabel,
  playLabel = 'Play',
}: {
  r: ReleaseCardData
  href: string
  upcomingLabel: string
  playLabel?: string
}) {
  return (
    <article className="drop">
      <Link className="drop-link" href={href} aria-label={`${r.title}, ${r.artists}`} />
      <div className="drop-art">
        <Artwork src={r.artwork} title={r.title} size={500} badge={r.upcoming ? upcomingLabel : undefined} />
        {r.preview ? <CardPlay track={r.preview} label={playLabel} /> : null}
      </div>
      <div className="row">
        {r.catalog ? <span>{r.catalog}</span> : <span />}
        {r.genre ? (
          <span className="genre">{r.genreHref ? <Link href={r.genreHref}>{r.genre}</Link> : r.genre}</span>
        ) : null}
        <time dateTime={r.dateIso}>{r.date}</time>
      </div>
      <div>
        <p className="t">
          <Link href={href}>{r.title}</Link>
        </p>
        <h3>
          {r.artistLinks.length > 0
            ? r.artistLinks.map((a, i) => (
                <span key={`${a.slug}-${i}`}>
                  {i > 0 ? (i === r.artistLinks.length - 1 ? (r.lang === 'es' ? ' y ' : ' & ') : ', ') : null}
                  <Link href={`/${r.lang}/artists/${a.slug}`}>{a.name}</Link>
                </span>
              ))
            : r.artists}
        </h3>
      </div>
    </article>
  )
}
