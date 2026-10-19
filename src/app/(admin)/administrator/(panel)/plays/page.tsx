import Link from 'next/link'
import { playSummary } from '@/lib/admin-data'

export const metadata = { title: 'Plays' }

export default async function PlaysPage() {
  const data = await playSummary()

  return (
    <div className="adm-wrap">
      <header className="adm-head">
        <div>
          <h1>Plays</h1>
          <p>
            {`${data.total.toLocaleString('en-GB')} preview${data.total === 1 ? '' : 's'} started on the site${data.month ? `, ${data.month.toLocaleString('en-GB')} in the last 30 days` : ''}. Each row is a play and cannot be edited.`}
          </p>
        </div>
      </header>
      <div className="adm-split">
        <section className="adm-panel">
          <h2>Tracks</h2>
          {data.tracks.length === 0 ? (
            <p className="adm-muted">No plays yet.</p>
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
                  <em>{track.plays.toLocaleString('en-GB')}</em>
                </li>
              ))}
            </ol>
          )}
        </section>
        <section className="adm-panel">
          <h2>Artists</h2>
          {data.artists.length === 0 ? (
            <p className="adm-muted">No plays yet.</p>
          ) : (
            <ol className="adm-rank">
              {data.artists.map((artist) => (
                <li key={artist.id}>
                  <Link href={`/administrator/artists/${artist.id}`}>
                    <strong>{artist.name}</strong>
                  </Link>
                  <em>{artist.plays.toLocaleString('en-GB')}</em>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  )
}
