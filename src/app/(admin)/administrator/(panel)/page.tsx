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
      label: 'Reservas',
      value: stats.bookings,
      note: stats.bookingsNew ? `${stats.bookingsNew} nuevas` : 'Bandeja del sello',
      icon: '✉',
      hot: stats.bookingsNew > 0,
    },
    {
      href: '/administrator/artists',
      label: 'Artistas',
      value: stats.artists,
      note: `${stats.roster} en el roster`,
      icon: '♫',
      hot: false,
    },
    {
      href: '/administrator/releases',
      label: 'Lanzamientos',
      value: stats.releases,
      note: stats.featured ? `${stats.featured.catalog || 'Destacado'} en el hero` : 'Sin destacado',
      icon: '◈',
      hot: false,
    },
    {
      href: '/administrator/tracks',
      label: 'Temas',
      value: stats.tracks,
      note: 'Spotify y TIDAL',
      icon: '♪',
      hot: false,
    },
    {
      href: '/administrator/plays',
      label: 'Escuchas',
      value: stats.plays,
      note: `${stats.playsMonth.toLocaleString('es-ES')} en 30 días`,
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
          <p>Reservas, textos del catálogo y enlaces que el sync de Beatport no pisa.</p>
        </div>
        <div className="adm-head-actions">
          <Link className="adm-btn" href="/administrator/bookings">
            Reservas
          </Link>
          <Link className="adm-btn ghost" href="/es">
            Ver la web
          </Link>
        </div>
      </header>

      <div className="adm-ribbon">
        <span>Fichas de catálogo</span>
        <strong>
          <CountUp target={catalog} />
        </strong>
        <span className="adm-ribbon-side">
          {stats.bookingsNew
            ? `${stats.bookingsNew} reserva${stats.bookingsNew === 1 ? '' : 's'} sin mirar`
            : 'Ninguna reserva nueva'}
        </span>
      </div>

      <div className="adm-cards">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className={`adm-card${card.hot ? ' hot' : ''}`}>
            <span className="adm-card-top">
              <span aria-hidden="true">{card.icon}</span>
              <span>Ver →</span>
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
          <h2>Últimas reservas</h2>
          {stats.latest.length === 0 ? (
            <p className="adm-muted">Todavía no ha entrado ninguna. Cuando alguien pida una noche, aparece aquí.</p>
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
          <h2>Accesos rápidos</h2>
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
