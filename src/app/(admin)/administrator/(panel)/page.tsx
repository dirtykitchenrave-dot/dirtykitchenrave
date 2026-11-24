import Link from 'next/link'
import { CountUp } from '@/components/admin/CountUp'
import { adminDashboard, formatDay, statusLabel } from '@/lib/admin-data'

export const metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const stats = await adminDashboard()
  const catalog = stats.artists + stats.releases + stats.tracks
  const cards = [
    {
      href: '/administrator/bookings',
      label: 'Bookings',
      value: stats.bookings,
      note: stats.bookingsNew ? `${stats.bookingsNew} new` : 'Label inbox',
      icon: '✉',
      hot: stats.bookingsNew > 0,
    },
    {
      href: '/administrator/artists',
      label: 'Artists',
      value: stats.artists,
      note: `${stats.roster} on the roster`,
      icon: '♫',
      hot: false,
    },
    {
      href: '/administrator/releases',
      label: 'Releases',
      value: stats.releases,
      note: stats.featured ? `${stats.featured.catalog || 'Pinned'} on the hero` : 'Nothing pinned',
      icon: '◈',
      hot: false,
    },
    {
      href: '/administrator/tracks',
      label: 'Tracks',
      value: stats.tracks,
      note: 'Spotify and TIDAL',
      icon: '♪',
      hot: false,
    },
    {
      href: '/administrator/plays',
      label: 'Plays',
      value: stats.plays,
      note: `${stats.playsMonth.toLocaleString('en-GB')} in 30 days`,
      icon: '▶',
      hot: false,
    },
  ]

  return (
    <div className="adm-wrap">
      <header className="adm-head">
        <div>
          <span className="adm-stamp">Backstage</span>
          <h1>Dashboard</h1>
          <p>Bookings, catalogue copy and links the Beatport sync does not overwrite.</p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn" href="/administrator/bookings">
            Bookings
          </Link>
          <Link className="adm-btn ghost" href="/en">
            View site
          </Link>
        </div>
      </header>

      <div className="adm-ribbon">
        <span>Catalogue records</span>
        <strong>
          <CountUp target={catalog} />
        </strong>
        <span className="adm-ribbon-side">
          {stats.bookingsNew
            ? `${stats.bookingsNew} new booking${stats.bookingsNew === 1 ? '' : 's'}`
            : 'No new bookings'}
        </span>
      </div>

      <div className="adm-cards">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className={`adm-card${card.hot ? ' hot' : ''}`}>
            <span className="adm-card-top">
              <span aria-hidden="true">{card.icon}</span>
              <span>Open →</span>
            </span>
            <strong>
              <CountUp target={card.value} />
            </strong>
            <em>{card.label}</em>
            <small>{card.note}</small>
          </Link>
        ))}
      </div>

      <div className="adm-split">
        <section className="adm-panel">
          <h2>Latest bookings</h2>
          {stats.latest.length === 0 ? (
            <p className="adm-muted">None yet. When someone books a label night, it shows up here.</p>
          ) : (
            <ul className="adm-list">
              {stats.latest.map((row) => (
                <li key={row.id}>
                  <Link href="/administrator/bookings">
                    <strong>{row.event_name}</strong>
                    <span>
                      {row.organisation} · {row.city} · {formatDay(row.event_date)}
                    </span>
                  </Link>
                  <em className={`st st-${row.status}`}>{statusLabel(row.status)}</em>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="adm-panel">
          <h2>Shortcuts</h2>
          <div className="adm-quick">
            {cards.map((card) => (
              <Link key={card.href} href={card.href}>
                <span aria-hidden="true">{card.icon}</span>
                {card.label}
              </Link>
            ))}
            <Link href="/administrator/artists?roster=1">
              <span aria-hidden="true">★</span>
              Roster
            </Link>
            <Link href="/administrator/releases?featured=1">
              <span aria-hidden="true">▲</span>
              Hero
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
