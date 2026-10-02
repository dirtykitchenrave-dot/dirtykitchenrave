import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import Channels from '@/components/Channels'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import { mostPlayed } from '@/lib/catalog'
import { joinNames } from '@/lib/format'
import { LABEL_MANAGER_SLUG, LINKS, SITE } from '@/lib/site'
import { pageMeta } from '@/lib/view'

type Props = { params: Promise<{ lang: string }> }

export const revalidate = 3600

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang } = await params
  if (!isLang(lang)) return {}
  const d = getDictionary(lang)
  return pageMeta(lang, '/about', d.about.title, d.about.metaDescription)
}

export default async function AboutPage({ params }: Props) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)
  const tops = await mostPlayed(10)

  return (
    <>
      <section className="mani">
        <div>
          <p className="quote">{d.about.lead}</p>
        </div>
        <div>
          <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>
            {d.about.title}
          </h1>
          <div className="prose">
            {d.about.body.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
          <div className="tags">
            <Link href={`/${lang}/artists/${LABEL_MANAGER_SLUG}`}>Afghan Headspin</Link>
            <Link href={`/${lang}/releases`}>{d.nav.releases}</Link>
            <Link href={`/${lang}/podcast`}>{d.nav.podcast}</Link>
          </div>
        </div>
      </section>
      <section className="pad">
        <div className="charts">
          <div>
            <h2>{d.about.topArtists}</h2>
            {tops.artists.length ? (
              <ol className="chart">
                {tops.artists.map((row, i) => (
                  <li key={row.artist.id}>
                    <span className="n">{i + 1}</span>
                    <Link href={`/${lang}/artists/${row.artist.slug}`}>{row.artist.name}</Link>
                    <span className="cnt" title={d.about.plays(row.plays)}>
                      {row.plays}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p>{d.about.noPlays}</p>
            )}
          </div>
          <div>
            <h2>{d.about.topTracks}</h2>
            {tops.tracks.length ? (
              <ol className="chart">
                {tops.tracks.map((row, i) => (
                  <li key={row.track.id}>
                    <span className="n">{i + 1}</span>
                    <span>
                      <Link href={`/${lang}/releases/${row.release.slug}#t-${row.track.id}`}>
                        {row.track.mix ? `${row.track.title} (${row.track.mix})` : row.track.title}
                      </Link>
                      {row.artistNames.length ? <span className="who">{joinNames(row.artistNames, lang)}</span> : null}
                    </span>
                    <span className="cnt" title={d.about.plays(row.plays)}>
                      {row.plays}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p>{d.about.noPlays}</p>
            )}
          </div>
        </div>
      </section>
      <section className="pad">
        <h2 className="big">{d.about.contact}</h2>
        <p className="lead" style={{ marginBottom: '1.5rem' }}>
          {d.about.contactText}
        </p>
        <div className="btns">
          {SITE.contactEmail && (
            <a className="btn" href={`mailto:${SITE.contactEmail}`}>
              {SITE.contactEmail}
            </a>
          )}
          <a className="btn ghost" href={LINKS.whatsapp} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          <a className="btn ghost" href={LINKS.instagram} target="_blank" rel="noopener noreferrer">
            Instagram
          </a>
          <a className="btn ghost" href={LINKS.discord} target="_blank" rel="noopener noreferrer">
            Discord
          </a>
        </div>
      </section>
      <Channels d={d} />
    </>
  )
}
