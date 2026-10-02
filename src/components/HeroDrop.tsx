import Link from 'next/link'
import type { Lang } from '@/i18n/config'
import type { Dictionary } from '@/i18n/dictionaries'
import { artworkAt, catalogNumber, formatDate } from '@/lib/format'
import { LINKS } from '@/lib/site'
import type { Artist, Release } from '@/lib/types'

/** Home hero from proposal 05: giant catalogue number, latest drop data, sleeve + spinning record. */
export default function HeroDrop({
  lang,
  d,
  release,
  artists,
}: {
  lang: Lang
  d: Dictionary
  release: Release | null
  artists: Artist[]
}) {
  const cover = artworkAt(release?.artwork ?? null, 800)
  const href = release ? `/${lang}/releases/${release.slug}` : `/${lang}/releases`
  return (
    <section className="hero" aria-labelledby="hero-title">
      <div className="l">
        <div className="drop-no">
          <small>{d.home.latestNumber}</small>
          {catalogNumber(release?.catalog ?? null)}
        </div>
        <div className="hero-copy">
          <h1 id="hero-title">{d.home.h1}</h1>
          <p className="hero-tag">{d.home.tagline}</p>
          {release && (
            <dl className="meta">
              <div>
                <dt>{d.home.drop}</dt>
                <dd>
                  <Link href={href}>{release.title}</Link>
                </dd>
              </div>
              <div>
                <dt>{d.home.artist}</dt>
                <dd>
                  {artists.length
                    ? artists.map((a, i) => (
                        <span key={a.id}>
                          {i > 0 && ', '}
                          <Link href={`/${lang}/artists/${a.slug}`}>{a.name}</Link>
                        </span>
                      ))
                    : 'Various Artists'}
                </dd>
              </div>
              <div>
                <dt>{d.home.out}</dt>
                <dd>{formatDate(release.releaseDate, lang)}</dd>
              </div>
            </dl>
          )}
          <div className="btns">
            <a className="btn" href={release?.links.beatport || LINKS.beatport} target="_blank" rel="noopener noreferrer">
              {d.home.shopCatalogue}
            </a>
            <Link className="btn ghost" href={`/${lang}/releases`}>
              {d.home.allDrops}
            </Link>
          </div>
        </div>
      </div>
      <Link className="r" href={href} aria-label={release?.title || d.home.allDrops}>
        <div className="sleeve">
          {cover ? (
            <img src={cover} alt="" />
          ) : (
            <>
              <span>
                Dirty
                <br />
                Kitchen
                <br />
                Rave
              </span>
              <span className="sleeve-meta">
                {release?.catalog || 'DKR'} / {release?.title}
              </span>
            </>
          )}
          {release ? (
            <span className="hero-open" aria-hidden="true">
              ▶
            </span>
          ) : null}
        </div>
        <div className="disc" aria-hidden="true" />
      </Link>
    </section>
  )
}
