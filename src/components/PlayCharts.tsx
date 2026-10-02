'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import type { Lang } from '@/i18n/config'
import { joinNames } from '@/lib/format'
import type { ChartArtist, ChartTrack } from '@/lib/supabase'

interface Labels {
  topArtists: string
  topTracks: string
  noPlays: string
}

/**
 * Asks /api/charts with no cache, the same idea as Optimal Breaks /top100.
 * Refreshes when a preview starts on this browser, and every few seconds while the tab is open.
 */
export default function PlayCharts({ lang, labels }: { lang: Lang; labels: Labels }) {
  const [artists, setArtists] = useState<ChartArtist[] | null>(null)
  const [tracks, setTracks] = useState<ChartTrack[] | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/charts', { cache: 'no-store' })
      if (!res.ok) return
      const json = (await res.json()) as { artists?: ChartArtist[]; tracks?: ChartTrack[] }
      setArtists(json.artists || [])
      setTracks(json.tracks || [])
    } catch {
      /* keep the last list */
    }
  }, [])

  useEffect(() => {
    void load()
    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load()
    }, 15000)
    const onPlay = () => void load()
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load()
    }
    window.addEventListener('dkr-play', onPlay)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(tick)
      window.removeEventListener('dkr-play', onPlay)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

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
