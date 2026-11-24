'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { Lang } from '@/i18n/config'
import { joinNames } from '@/lib/format'
import type { ChartArtist, ChartTrack } from '@/lib/plays'

interface Labels {
  topArtists: string
  topTracks: string
  noPlays: string
}

/** One read of /api/charts. The response is cached for seven days. */
export default function PlayCharts({ lang, labels }: { lang: Lang; labels: Labels }) {
  const [artists, setArtists] = useState<ChartArtist[] | null>(null)
  const [tracks, setTracks] = useState<ChartTrack[] | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/charts')
        if (!res.ok) return
        const json = (await res.json()) as { artists?: ChartArtist[]; tracks?: ChartTrack[] }
        if (cancelled) return
        setArtists(json.artists || [])
        setTracks(json.tracks || [])
      } catch {
        /* leave the empty state */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="charts">
      <div>
        <h2>{labels.topArtists}</h2>
        {artists === null ? null : artists.length ? (
          <ol className="chart">
            {artists.map((row, i) => (
              <li key={row.id}>
                <span className="n">{i + 1}</span>
                <Link href={`/${lang}/artists/${row.slug}`}>{row.name}</Link>
                <span className="cnt">{row.plays}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p>{labels.noPlays}</p>
        )}
      </div>
      <div>
        <h2>{labels.topTracks}</h2>
        {tracks === null ? null : tracks.length ? (
          <ol className="chart">
            {tracks.map((row, i) => (
              <li key={row.id}>
                <span className="n">{i + 1}</span>
                <span>
                  <Link href={`/${lang}/releases/${row.releaseSlug}#t-${row.id}`}>
                    {row.mix ? `${row.title} (${row.mix})` : row.title}
                  </Link>
                  {row.artistNames.length ? <span className="who">{joinNames(row.artistNames, lang)}</span> : null}
                </span>
                <span className="cnt">{row.plays}</span>
              </li>
            ))}
          </ol>
        ) : (
          <p>{labels.noPlays}</p>
        )}
      </div>
    </div>
  )
}
