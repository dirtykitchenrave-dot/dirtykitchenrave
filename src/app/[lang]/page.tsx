import Link from 'next/link'
import { notFound } from 'next/navigation'
import Channels from '@/components/Channels'
import DemoCta from '@/components/DemoCta'
import HeroDrop from '@/components/HeroDrop'
import Marquee from '@/components/Marquee'
import ReleaseCard from '@/components/ReleaseCard'
import ShopGrid from '@/components/ShopGrid'
import { isLang } from '@/i18n/config'
import { getDictionary } from '@/i18n/dictionaries'
import {
  artistsByIds,
  artistsWithCounts,
  getCatalog,
  latestRelease,
  releasedReleases,
  upcomingReleases,
} from '@/lib/catalog'
import { GENRE_MARQUEE } from '@/lib/site'
import { toCard } from '@/lib/view'

export const revalidate = 3600

export default async function Home({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params
  if (!isLang(lang)) notFound()
  const d = getDictionary(lang)
  const c = await getCatalog()

  const latest = latestRelease(c)
  const upcoming = upcomingReleases(c).slice(0, 4)
  const drops = releasedReleases(c)
    .filter((r) => r.id !== latest?.id)
    .slice(0, 8)
  const crew = artistsWithCounts(c).slice(0, 24)

  return (
    <>
      <HeroDrop lang={lang} d={d} release={latest} artists={latest ? artistsByIds(c, latest.artistIds) : []} />

      <Marquee items={GENRE_MARQUEE} />

      <section className="mani" id="label">
        <div>
          <p className="quote">{d.home.quote}</p>
        </div>
        <div>
          <p>{d.home.about1}</p>
          <p>{d.home.about2}</p>
          <div className="tags">
            {d.home.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          <p style={{ marginTop: '1.5rem' }}>
            <Link className="btn ghost" href={`/${lang}/about`}>
              {d.nav.about}
            </Link>
          </p>
        </div>
      </section>

      {upcoming.length > 0 && (
        <section>
          <div className="pad-top section-head">
            <h2 className="big">{d.home.upcomingTitle}</h2>
          </div>
          <div className="drops">
            {upcoming.map((r) => (
              <ReleaseCard
                key={r.id}
                r={toCard(c, r, lang)}
                href={`/${lang}/releases/${r.slug}`}
                upcomingLabel={d.releases.upcoming}
                playLabel={d.release.play}
              />
            ))}
          </div>
        </section>
      )}

      <section id="drops">
        <div className="pad-top section-head">
          <h2 className="big">{d.home.dropsTitle}</h2>
          <Link href={`/${lang}/releases`}>{d.home.allDrops}</Link>
        </div>
        <div className="drops">
          {drops.map((r) => (
            <ReleaseCard
              key={r.id}
              r={toCard(c, r, lang)}
              href={`/${lang}/releases/${r.slug}`}
              upcomingLabel={d.releases.upcoming}
              playLabel={d.release.play}
            />
          ))}
        </div>
      </section>

      <section id="shop">
        <div className="pad-top section-head">
          <h2 className="big">{d.home.shopTitle}</h2>
          <Link href={`/${lang}/shop`}>{d.nav.shop}</Link>
        </div>
        <ShopGrid d={d} />
      </section>

      <section id="crew" className="pad">
        <div className="section-head">
          <h2 className="big">{d.home.crewTitle}</h2>
          <Link href={`/${lang}/artists`}>{d.home.allArtists}</Link>
        </div>
        <p className="crew">
          {crew.map((a) => (
            <Link key={a.id} className={a.roster ? 'boss' : undefined} href={`/${lang}/artists/${a.slug}`}>
              {a.name}
            </Link>
          ))}
        </p>
      </section>

      <Channels d={d} />
      <DemoCta d={d} />
    </>
  )
}
