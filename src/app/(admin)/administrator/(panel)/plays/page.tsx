import Link from 'next/link'
import { playSummary } from '@/lib/admin-data'

export const metadata = { title: 'Escuchas' }

export default async function PlaysPage() {
  const data = await playSummary()

  return (
    <div className="adm-wrap">
      <header className="adm-head">
        <div>
          <h1>Escuchas</h1>
          <p>
            {`${data.total.toLocaleString('es-ES')} previews empezadas en la web${data.month ? `, ${data.month.toLocaleString('es-ES')} en los últimos 30 días` : ''}. Cada fila es un play, no se editan.`}
          </p>
        </div>
      </header>
      <div className="adm-split">
        <section className="adm-panel">
          <h2>Temas</h2>
          {data.tracks.length === 0 ? (
            <p className="adm-muted">Todavía no hay plays.</p>
          ) : (
            <ol className="adm-rank">
              {data.tracks.map((track) => (
                <li key={track.id}>
                  <Link href={`/administrator/tracks/${track.id}`}>
                    <strong>
                      {track.title}
                      {track.mix ? ` (${track.mix})` : ''}
                    </strong>
                    <span>{track.artistNames.join(', ') || '—'}</span>
                  </Link>
                  <em>{track.plays.toLocaleString('es-ES')}</em>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="adm-panel">
          <h2>Artistas</h2>
          {data.artists.length === 0 ? (
            <p className="adm-muted">Todavía no hay plays.</p>
          ) : (
            <ol className="adm-rank">
              {data.artists.map((artist) => (
                <li key={artist.id}>
                  <Link href={`/administrator/artists/${artist.id}`}>
                    <strong>{artist.name}</strong>
                  </Link>
                  <em>{artist.plays.toLocaleString('es-ES')}</em>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
